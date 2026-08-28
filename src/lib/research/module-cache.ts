/*
 * SPDX-License-Identifier: Apache-2.0
 */

import 'server-only';

import { createHash } from 'node:crypto';
import { logger } from '@/lib/logger';
import Redis from 'ioredis';

const CACHE_TTL_SECONDS = 20 * 60;
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
const LOCK_TTL_SECONDS = 6 * 60;
const LOCK_TTL_MS = LOCK_TTL_SECONDS * 1000;

export type ModuleEndpointCacheKey = {
  userId: string;
  endpointId: string;
  billingMode: 'platform' | 'byok';
  sandbox?: boolean;
  params: Record<string, unknown>;
  projectorVersion: string;
};

type RedisLike = {
  del(key: string): Promise<unknown>;
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
    nx?: 'NX',
  ): Promise<unknown>;
};

type MemoryEntry = {
  expiresAt: number;
  payload: unknown;
};

type LockEntry = {
  expiresAt: number;
  token: string;
};

const memoryCache = new Map<string, MemoryEntry>();
const memoryLocks = new Map<string, LockEntry>();

let redisClient: RedisLike | null | undefined;
let testRedisClient: RedisLike | null | undefined;
let fallbackWarningLogged = false;

export async function getCachedModuleEndpoint(
  key: ModuleEndpointCacheKey,
): Promise<unknown | null> {
  const cacheKey = cacheKeyFor(key);
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      warnFallback(error);
    }
  } else {
    warnFallback('Redis is not configured.');
  }

  return getMemory(cacheKey);
}

export async function setCachedModuleEndpoint(
  key: ModuleEndpointCacheKey,
  payload: unknown,
): Promise<void> {
  const cacheKey = cacheKeyFor(key);
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS);
      return;
    } catch (error) {
      warnFallback(error);
    }
  } else {
    warnFallback('Redis is not configured.');
  }

  memoryCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload,
  });
}

export async function acquireModuleEndpointLock(
  key: ModuleEndpointCacheKey,
  token: string,
): Promise<{ acquired: boolean; token: string; via: 'redis' | 'memory' }> {
  const lockKey = lockKeyFor(key);
  const redis = getRedisClient();

  if (redis) {
    try {
      const result = await redis.set(
        lockKey,
        token,
        'EX',
        LOCK_TTL_SECONDS,
        'NX',
      );
      return { acquired: result === 'OK', token, via: 'redis' };
    } catch (error) {
      warnFallback(error);
    }
  } else {
    warnFallback('Redis is not configured.');
  }

  return { acquired: acquireMemoryLock(lockKey, token), token, via: 'memory' };
}

export async function releaseModuleEndpointLock(
  key: ModuleEndpointCacheKey,
  token: string,
): Promise<void> {
  const lockKey = lockKeyFor(key);
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

function getMemory(cacheKey: string): unknown | null {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    memoryCache.delete(cacheKey);
    return null;
  }

  return entry.payload;
}

function acquireMemoryLock(lockKey: string, token: string): boolean {
  const now = Date.now();
  const current = memoryLocks.get(lockKey);
  if (current && current.expiresAt > now) {
    return false;
  }

  memoryLocks.set(lockKey, {
    expiresAt: now + LOCK_TTL_MS,
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

function cacheKeyFor(key: ModuleEndpointCacheKey): string {
  return [
    'research:module:cache',
    key.userId,
    key.endpointId,
    key.billingMode,
    key.sandbox ? 'sandbox' : 'live',
    key.projectorVersion,
    hashStable(key.params),
  ].join(':');
}

function lockKeyFor(key: ModuleEndpointCacheKey): string {
  return cacheKeyFor(key).replace('research:module:cache:', 'research:module:lock:');
}

function hashStable(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${stableStringify(entryValue)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
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
    commandTimeout: 500,
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

function warnFallback(error: unknown): void {
  if (fallbackWarningLogged) return;
  fallbackWarningLogged = true;
  logger.warn('Research module Redis unavailable - using memory fallback', {
    event: 'research.module.redisFallback',
    reason: error instanceof Error ? error.message : String(error),
  });
}

export function __moduleCacheKeyForTests(key: ModuleEndpointCacheKey): string {
  return cacheKeyFor(key);
}

export function __setResearchModuleCacheRedisForTests(
  client: RedisLike | null,
): void {
  testRedisClient = client;
}

export function __resetResearchModuleCacheForTests(): void {
  memoryCache.clear();
  memoryLocks.clear();
  testRedisClient = undefined;
  fallbackWarningLogged = false;
}
