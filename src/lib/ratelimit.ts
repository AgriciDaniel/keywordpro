import 'server-only';
import { logger } from '@/lib/logger';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

type RateLimitResponse = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  // True when the response is "fail-open" (rate limiting not enforced due to infra/config).
  fallback?: boolean;
};

type Backend = 'upstash' | 'tcp' | 'none';

let backend: Backend | null = null;

function resolveBackend(): Backend {
  if (backend) return backend;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl?.startsWith('https://') && upstashToken) {
    backend = 'upstash';
    return backend;
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl?.startsWith('redis://') || redisUrl?.startsWith('rediss://')) {
    backend = 'tcp';
    return backend;
  }

  backend = 'none';
  return backend;
}

// Initialize Redis connections (Upstash REST vs standard TCP Redis)
let upstashRedis: UpstashRedis | null = null;
let upstashRedisConfigured = false;
let tcpRedis: Redis | null = null;
let tcpRedisConfigured = false;
let tcpRedisErrorLogged = false;

let redisWarningLogged = false;
let authFallbackWarningLogged = false;
let aiFallbackWarningLogged = false;
let researchFallbackWarningLogged = false;
let uploadFallbackWarningLogged = false;

// In-memory rate-limit fallback. Used when Redis is configured but
// unreachable (transient outage, network blip, Upstash maintenance).
// Scope is per-process - each server instance tracks its own buckets,
// so at N instances the effective limit is roughly limit × N during an
// outage. Still bounded, still much better than fail-open.
//
// SEC-07-M (2026-04-19): the previous design only had this fallback
// wired for auth. AI + upload were unconditionally fail-open, which
// meant a Redis hiccup during abuse = unbounded Gemini spend or
// unbounded R2 writes. Extending the fallback to AI + upload caps the
// money exposure even when Redis is sick.
function createInMemoryLimiter(kind: string, max: number, windowMs: number) {
  const attempts = new Map<string, number[]>();
  let lastCleanupAt = 0;

  function cleanup(now: number) {
    // Keep cleanup cheap: only sweep occasionally.
    if (now - lastCleanupAt < windowMs) return;
    lastCleanupAt = now;

    for (const [key, timestamps] of attempts) {
      const cutoff = now - windowMs;
      const pruned = timestamps.filter((t) => t > cutoff);
      if (pruned.length === 0) attempts.delete(key);
      else attempts.set(key, pruned);
    }
  }

  return {
    async limit(identifier: string): Promise<RateLimitResponse> {
      const now = Date.now();
      cleanup(now);

      const key = `${kind}:${identifier}`;
      const cutoff = now - windowMs;
      const existing = attempts.get(key) ?? [];
      const recent = existing.filter((t) => t > cutoff);

      if (recent.length >= max) {
        const oldest = recent[0] ?? now;
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset: oldest + windowMs,
        };
      }

      recent.push(now);
      attempts.set(key, recent);

      const oldest = recent[0] ?? now;
      return {
        success: true,
        limit: max,
        remaining: Math.max(0, max - recent.length),
        reset: oldest + windowMs,
      };
    },
  };
}

// Auth: 5 attempts / 15 min (matches the Redis-backed config below).
const authFallback = createInMemoryLimiter('auth', 5, 15 * 60 * 1000);

// AI: 30 requests / 1 hour. Expensive per-call (Gemini tokens); a Redis
// outage without this would let one compromised account burn real money.
const aiFallback = createInMemoryLimiter('ai', 30, 60 * 60 * 1000);

/**
 * Session-caller budget for one minute of research dispatches.
 *
 * The console posts one request per endpoint, so a complete keyword report is
 * not one call. The limiter must let every endpoint in a report finish without
 * making the final panels lose a race against an internal allowance.
 *
 * 150 clears several complete reports while still bounding a runaway browser.
 * Change it only against the measured report size, not a guess.
 */
export const RESEARCH_POINTS_PER_MINUTE = 150;

// Research API: see the derivation above.
const researchFallback = createInMemoryLimiter(
  'research',
  RESEARCH_POINTS_PER_MINUTE,
  60 * 1000,
);

// Upload: 20 requests / 1 hour. Bounded by MAX_FILE_SIZE per request,
// but during a Redis outage an abusive user could still fill R2 with
// thousands of small valid-MIME files without this cap.
const uploadFallback = createInMemoryLimiter('upload', 20, 60 * 60 * 1000);

function getUpstashRedis() {
  if (!upstashRedis && !upstashRedisConfigured) {
    upstashRedisConfigured = true; // Only try to configure once

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token || !url.startsWith('https://')) return null;

    upstashRedis = new UpstashRedis({ url, token });
  }
  return upstashRedis;
}

function getTcpRedis() {
  if (!tcpRedis && !tcpRedisConfigured) {
    tcpRedisConfigured = true; // Only try to configure once

    const url = process.env.REDIS_URL;
    if (!url || (!url.startsWith('redis://') && !url.startsWith('rediss://'))) {
      return null;
    }

    // Rate limiting should never hang requests if Redis is down.
    tcpRedis = new Redis(url, {
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times >= 3) return null;
        return Math.min(times * 50, 200);
      },
    });

    // Prevent noisy "Unhandled error event" logs when Redis is unreachable.
    tcpRedis.on('error', (err) => {
      if (tcpRedisErrorLogged) return;
      tcpRedisErrorLogged = true;
      logger.warn('Redis connection error', { event: 'ratelimit.redis.connectionError', reason: err?.message || String(err) });
    });
  }
  return tcpRedis;
}

/**
 * Response when Redis is unavailable
 * - Without Redis: allow requests (no rate limiting)
 * - With Redis: proper rate limiting enforced
 *
 * NOTE:
 * - If you deploy to an environment that can't do TCP connections (e.g. Workers),
 *   use Upstash REST via UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.
 * - On Railway/Node, you can use standard Redis via REDIS_URL (redis://...).
 */
function fallbackResponse(): RateLimitResponse {
  // Fail-open: allow requests when Upstash is not configured
  // Rate limiting is a defense-in-depth measure, not a hard requirement
  return {
    success: true,
    limit: 1000,
    remaining: 999,
    reset: Date.now() + 60000,
    fallback: true,
  };
}

function warnOnce(message: string) {
  if (redisWarningLogged) return;
  logger.warn(message, { event: 'ratelimit.config.warning' });
  redisWarningLogged = true;
}

type LimitFn = (identifier: string) => Promise<RateLimitResponse>;

type UpstashDuration = Parameters<typeof Ratelimit.slidingWindow>[1];

type LimiterConfig = {
  points: number;
  windowSeconds: number;
  windowLabel: UpstashDuration;
  prefix: string;
};

const limiterConfigs = {
  api: {
    points: 100,
    windowSeconds: 60,
    windowLabel: '1 m',
    prefix: 'api',
  },
  ai: {
    points: 30,
    windowSeconds: 60 * 60,
    windowLabel: '1 h',
    prefix: 'ai',
  },
  auth: {
    points: 5,
    windowSeconds: 15 * 60,
    windowLabel: '15 m',
    prefix: 'auth',
  },
  research: {
    points: RESEARCH_POINTS_PER_MINUTE,
    windowSeconds: 60,
    windowLabel: '1 m',
    prefix: 'research',
  },
  upload: {
    points: 20,
    windowSeconds: 60 * 60,
    windowLabel: '1 h',
    prefix: 'upload',
  },
  // SEC-08-M: Stripe webhook rate guard. Sized generously enough to
  // absorb legitimate Stripe retry bursts (Stripe retries exponentially
  // for up to 3 days on 5xx responses - can stack events rapidly if our
  // endpoint was briefly down) while still bounding forged-signature DoS.
  // Stripe delivers from a small pool of documented IP ranges, so per-IP
  // bucketing is effective against single-source attackers.
  webhook: {
    points: 300,
    windowSeconds: 60,
    windowLabel: '1 m',
    prefix: 'webhook',
  },
} as const satisfies Record<string, LimiterConfig>;

let upstashLimiters: Record<string, LimitFn> | null = null;
function getUpstashLimiters() {
  if (upstashLimiters) return upstashLimiters;

  const redis = getUpstashRedis();
  if (!redis) return null;

  upstashLimiters = Object.fromEntries(
    Object.entries(limiterConfigs).map(([key, cfg]) => {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.points, cfg.windowLabel),
        analytics: true,
        prefix: cfg.prefix,
      });

      return [key, (identifier: string) => limiter.limit(identifier)];
    })
  );

  return upstashLimiters;
}

let tcpLimiters: Record<string, LimitFn> | null = null;
function getTcpLimiters() {
  if (tcpLimiters) return tcpLimiters;

  const redis = getTcpRedis();
  if (!redis) return null;

  tcpLimiters = Object.fromEntries(
    Object.entries(limiterConfigs).map(([key, cfg]) => {
      const limiter = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `rl:${cfg.prefix}`,
        points: cfg.points,
        duration: cfg.windowSeconds,
      });

      const limit: LimitFn = async (identifier) => {
        try {
          const res = await limiter.consume(identifier);
          return {
            success: true,
            limit: cfg.points,
            remaining: res.remainingPoints,
            reset: Date.now() + res.msBeforeNext,
          };
        } catch (err) {
          // Exceeded: rate-limiter-flexible rejects with a RateLimiterRes-like object.
          if (
            err &&
            typeof err === 'object' &&
            'msBeforeNext' in err &&
            'remainingPoints' in err
          ) {
            const e = err as { msBeforeNext: number; remainingPoints: number };
            return {
              success: false,
              limit: cfg.points,
              remaining: Math.max(0, e.remainingPoints ?? 0),
              reset: Date.now() + (e.msBeforeNext ?? 0),
            };
          }

          // Infrastructure failure: fail-open for non-auth; auth handled by caller.
          return fallbackResponse();
        }
      };

      return [key, limit];
    })
  );

  return tcpLimiters;
}

async function limit(kind: keyof typeof limiterConfigs, identifier: string) {
  const resolved = resolveBackend();

  if (resolved === 'upstash') {
    const limiters = getUpstashLimiters();
    if (!limiters) {
      warnOnce(
        '[RATELIMIT] UPSTASH_REDIS_REST_URL/TOKEN set but could not initialize - rate limiting disabled.'
      );
      return fallbackResponse();
    }
    return limiters[kind](identifier);
  }

  if (resolved === 'tcp') {
    const limiters = getTcpLimiters();
    if (!limiters) {
      warnOnce(
        '[RATELIMIT] REDIS_URL set but could not initialize Redis client - rate limiting disabled.'
      );
      return fallbackResponse();
    }
    return limiters[kind](identifier);
  }

  warnOnce(
    '[RATELIMIT] No supported Redis configured - rate limiting disabled. ' +
      'Set REDIS_URL (redis://...) on Railway/Node or UPSTASH_REDIS_REST_URL/TOKEN (https://...) on Workers.'
  );
  return fallbackResponse();
}

// Rate limiter for general API endpoints
// 100 requests per minute per user (generous for power users clicking through data)
export async function apiRateLimit(identifier: string) {
  return limit('api', identifier);
}

// Rate limiter for expensive AI operations
// 30 requests per hour per user (allows iterating on 5-10 articles with edits)
//
// SEC-07-M: in production, if Redis is unreachable we degrade to an
// in-memory per-instance fallback rather than fail-open. An attacker +
// Redis outage used to mean unbounded Gemini spend; now it's bounded
// by this fallback (per-instance, so still softer than Redis-coordinated
// enforcement, but bounded).
export async function aiRateLimit(identifier: string) {
  const res = await limit('ai', identifier);

  if (!res.fallback) return res;

  if (process.env.NODE_ENV === 'production') {
    if (!aiFallbackWarningLogged) {
      logger.warn('Redis AI limiter unavailable - using in-memory fallback', {
        event: 'ratelimit.ai.fallback',
      });
      aiFallbackWarningLogged = true;
    }
    return aiFallback.limit(identifier);
  }

  return res;
}

// Rate limiter for single-endpoint research dispatches from session callers.
// 30 requests per minute per user. During Redis outages in production, fall
// back to a per-instance memory limiter rather than failing open.
export async function researchRateLimit(
  identifier: string,
  _options: { window: '1m'; limit: number } = { window: '1m', limit: 30 },
) {
  const res = await limit('research', identifier);

  if (!res.fallback) return res;

  if (process.env.NODE_ENV === 'production') {
    if (!researchFallbackWarningLogged) {
      logger.warn(
        'Redis research limiter unavailable - using in-memory fallback',
        { event: 'ratelimit.research.fallback' },
      );
      researchFallbackWarningLogged = true;
    }
    return researchFallback.limit(identifier);
  }

  return res;
}

// Rate limiter for authentication endpoints
// 5 attempts per 15 minutes per IP
export async function authRateLimit(identifier: string) {
  const res = await limit('auth', identifier);

  // Auth is security-sensitive: if Redis is missing or erroring, don't silently fail-open in production.
  if (!res.fallback) return res;

  if (process.env.NODE_ENV === 'production') {
    if (!authFallbackWarningLogged) {
      logger.warn('Redis auth limiter unavailable - using in-memory fallback', { event: 'ratelimit.auth.fallback' });
      authFallbackWarningLogged = true;
    }
    return authFallback.limit(identifier);
  }

  return res;
}

// Rate limiter for file uploads
// 20 uploads per hour per user (allows setting up brand assets + article images)
//
// SEC-07-M: same in-memory fallback pattern as aiRateLimit. Upload isn't
// directly money-burning the way AI is, but during a Redis outage an
// abusive user could still fill R2 with thousands of valid-MIME files.
// In-memory fallback caps the blast radius.
export async function uploadRateLimit(identifier: string) {
  const res = await limit('upload', identifier);

  if (!res.fallback) return res;

  if (process.env.NODE_ENV === 'production') {
    if (!uploadFallbackWarningLogged) {
      logger.warn(
        'Redis upload limiter unavailable - using in-memory fallback',
        { event: 'ratelimit.upload.fallback' }
      );
      uploadFallbackWarningLogged = true;
    }
    return uploadFallback.limit(identifier);
  }

  return res;
}

// Rate limiter for webhook endpoints (Stripe today; extensible)
// 300 requests per minute per IP.
//
// SEC-08-M: previously unlimited. A flood of forged-signature requests
// each cost signature-verification CPU + a `webhook_events` idempotency
// INSERT round-trip before being rejected. 300/min is generous enough
// for Stripe's legitimate retry bursts (Stripe stacks exponentially-
// backed-off retries when our endpoint recovers from a blip) while
// blocking single-source DoS attempts. Fails open on Redis outage -
// webhooks are critical for billing correctness, dropping a real event
// is worse than briefly accepting a flood.
export async function webhookRateLimit(identifier: string) {
  return limit('webhook', identifier);
}

// Helper to get identifier from request (userId or IP)
export function getIdentifier(userId?: string, request?: Request): string {
  if (userId) return userId;
  if (request) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
  }
  return 'anonymous';
}
