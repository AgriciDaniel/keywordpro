/**
 * Keyword Pro API v1 - request correlation.
 *
 * Every API request gets a unique requestId that flows through all
 * downstream operations. This enables end-to-end tracing: when a
 * customer reports "my job failed," we can find the exact chain of
 * what happened.
 *
 * Honors an incoming x-request-id header (useful for chained calls
 * and customer-side correlation) or generates a new UUID.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '@/lib/logger';

export function createRequestContext(request: Request) {
  const requestId = normalizeRequestId(request.headers.get('x-request-id')) ?? randomUUID();
  const log = logger.withContext({ requestId });
  return { requestId, log };
}

function normalizeRequestId(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 128);
}
