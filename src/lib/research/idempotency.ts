/*
 * SPDX-License-Identifier: Apache-2.0
 */

import 'server-only';

import { createHash } from 'node:crypto';
import { logger } from '@/lib/logger';
import Redis from 'ioredis';

const TTL_SECONDS = 60;
const TTL_MS = TTL_SECONDS * 1000;

export interface IdempotencyKey {
  userId: string;
  endpointId: string;
  key: string;
}

type RedisLike = {
  eval(
    script: string,
    numberOfKeys: number,
    key: string,
    token: string,
  ): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    seconds: number,
    nx: 'NX',
  ): Promise<unknown>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    seconds: number,
  ): Promise<unknown>;
};

type MemoryEntry = {
  expiresAt: number;
  fingerprint?: string;
  payload: unknown;
};

type StoredPayload = {
  __researchIdempotency: true;
  fingerprint?: string;
  payload: unknown;
};

const memoryCache = new Map<string, MemoryEntry>();
const memoryLocks = new Map<string, { expiresAt: number; token: string }>();

let redisClient: RedisLike | null | undefined;
let testRedisClient: RedisLike | null | undefined;
let fallbackWarningLogged = false;

export async function getCachedResponse(
  k: IdempotencyKey,
  fingerprint?: string,
): Promise<unknown | null> {
  const cacheKey = cacheKeyFor(k);
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return decodeCachedPayload(cached, fingerprint);
    } catch (error) {
      warnFallback(error);
    }
  } else {
    warnFallback('Redis is not configured.');
  }

  return getMemory(cacheKey, fingerprint);
}

export async function setCachedResponse(
  k: IdempotencyKey,
  payload: unknown,
  fingerprint?: string,
): Promise<void> {
  const cacheKey = cacheKeyFor(k);
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.set(
        cacheKey,
        JSON.stringify(wrapPayload(payload, fingerprint)),
        'EX',
        TTL_SECONDS,
      );
      return;
    } catch (error) {
      warnFallback(error);
    }
  } else {
    warnFallback('Redis is not configured.');
  }

  setMemory(cacheKey, payload, fingerprint);
}

export async function acquireIdempotencyLock(
  k: IdempotencyKey,
  token: string,
): Promise<boolean> {
  const lockKey = lockKeyFor(k);
  const redis = getRedisClient();

  if (redis) {
    try {
      const result = await redis.set(lockKey, token, 'EX', TTL_SECONDS, 'NX');
      return result === 'OK';
    } catch (error) {
      warnFallback(error);
    }
  } else {
    warnFallback('Redis is not configured.');
  }

  return acquireMemoryLock(lockKey, token);
}

export async function releaseIdempotencyLock(
  k: IdempotencyKey,
  token: string,
): Promise<void> {
  const lockKey = lockKeyFor(k);
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.eval(
        [
          'if redis.call("get", KEYS[1]) == ARGV[1] then',
          '  return redis.call("del", KEYS[1])',
          'end',
          'return 0',
        ].join('\n'),
        1,
        lockKey,
        token,
      );
      return;
    } catch (error) {
      warnFallback(error);
    }
  }

  releaseMemoryLock(lockKey, token);
}

function cacheKeyFor(k: IdempotencyKey): string {
  const digest = createHash('sha256').update(k.key).digest('hex');
  return `research:idem:${k.userId}:${k.endpointId}:${digest}`;
}

function lockKeyFor(k: IdempotencyKey): string {
  return cacheKeyFor(k).replace('research:idem:', 'research:idemlock:');
}

function getRedisClient(): RedisLike | null {
  if (testRedisClient !== undefined) return testRedisClient;
  if (redisClient !== undefined) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl?.startsWith('redis://') && !redisUrl?.startsWith('rediss://')) {
    redisClient = null;
    return redisClient;
  }

  const client = new Redis(redisUrl, {
    connectTimeout: 500,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times >= 3) return null;
      return Math.min(times * 50, 200);
    },
  });
  client.on('error', (error) => warnFallback(error));
  redisClient = client;
  return redisClient;
}

function getMemory(cacheKey: string, fingerprint?: string): unknown | null {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    memoryCache.delete(cacheKey);
    return null;
  }

  if (fingerprint && entry.fingerprint !== fingerprint) {
    return null;
  }

  return entry.payload;
}

function setMemory(
  cacheKey: string,
  payload: unknown,
  fingerprint?: string,
): void {
  memoryCache.set(cacheKey, {
    expiresAt: Date.now() + TTL_MS,
    fingerprint,
    payload,
  });
}

function acquireMemoryLock(lockKey: string, token: string): boolean {
  const now = Date.now();
  const current = memoryLocks.get(lockKey);
  if (current && current.expiresAt > now) {
    return false;
  }

  memoryLocks.set(lockKey, {
    expiresAt: now + TTL_MS,
    token,
  });
  return true;
}

function releaseMemoryLock(lockKey: string, token: string): void {
  const current = memoryLocks.get(lockKey);
  if (current?.token === token) {
    memoryLocks.delete(lockKey);
  }
}

function wrapPayload(payload: unknown, fingerprint?: string): StoredPayload {
  return {
    __researchIdempotency: true,
    fingerprint,
    payload,
  };
}

function decodeCachedPayload(
  value: string,
  fingerprint?: string,
): unknown | null {
  const parsed = JSON.parse(value) as unknown;
  if (!isStoredPayload(parsed)) return parsed;
  if (fingerprint && parsed.fingerprint !== fingerprint) return null;
  return parsed.payload;
}

function isStoredPayload(value: unknown): value is StoredPayload {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__researchIdempotency' in value &&
    (value as { __researchIdempotency?: unknown }).__researchIdempotency === true
  );
}

function warnFallback(error: unknown): void {
  if (fallbackWarningLogged) return;
  fallbackWarningLogged = true;
  logger.warn('Research idempotency Redis unavailable - using memory cache', {
    event: 'research.idempotency.redisFallback',
    reason: error instanceof Error ? error.message : String(error),
  });
}

export function __researchIdempotencyCacheKeyForTests(
  k: IdempotencyKey,
): string {
  return cacheKeyFor(k);
}

export function __setResearchIdempotencyRedisForTests(
  client: RedisLike | null,
): void {
  testRedisClient = client;
}

export function __resetResearchIdempotencyForTests(): void {
  memoryCache.clear();
  memoryLocks.clear();
  testRedisClient = undefined;
  fallbackWarningLogged = false;
}
