/**
 * Keyword Pro API v1 - per-API-key rate limiting.
 *
 * Wraps the existing Upstash Redis rate limiter with an API-key-specific
 * prefix. Reuses the 'api' tier: 100 requests per minute per key.
 */

import {
  RESEARCH_POINTS_PER_MINUTE,
  apiRateLimit,
  researchRateLimit,
} from '@/lib/ratelimit';
import { ApiError } from './errors';

export async function enforceApiRateLimit(apiKeyId: string): Promise<void> {
  const result = await apiRateLimit(`apiv1:${apiKeyId}`);
  if (!result.success) {
    throw new ApiError('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429);
  }
}

/**
 * The ceiling here is the 'research' tier in lib/ratelimit, not this
 * argument. `options` only namespaces the bucket key, so passing a number
 * that disagrees with the tier changes which bucket is counted and not how
 * much it allows. Leave the default alone unless the tier moves with it.
 */
export async function enforceUserRateLimit(
  userId: string,
  options: { window: '1m'; limit: number } = {
    window: '1m',
    limit: RESEARCH_POINTS_PER_MINUTE,
  },
): Promise<void> {
  const result = await researchRateLimit(
    `research:${userId}:${options.window}:${options.limit}`,
    options,
  );
  if (!result.success) {
    throw new ApiError('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429);
  }
}
