import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { setCorrelationIdReader } from './correlation-id-reader';

/**
 * Correlation ID (OB-03-C)
 *
 * A correlationId is a short random string attached to every log line,
 * Sentry event, job payload, and ws-notify event that originates from a
 * single user action. With one ID in hand you can grep the entire
 * Axiom + Sentry + worker log stream for every event related to that
 * action - no timestamp archaeology.
 *
 * Flow:
 *   1. HTTP entry point (API route / server action) sets an ID into
 *      AsyncLocalStorage via `runWithCorrelationId(id, fn)`.
 *   2. All descendant code - logger, Sentry capture, job enqueue,
 *      ws-notify producer - reads it via `getCorrelationId()`.
 *   3. Job enqueues embed the ID in the payload so the worker picks it
 *      up when the job runs later.
 *   4. Worker does the same thing on the other side.
 *
 * If no context is set (legacy code paths, crons), `getCorrelationId()`
 * returns undefined and callers fall back to generating fresh IDs on
 * demand via `generateCorrelationId()`.
 */

const correlationIdStore = new AsyncLocalStorage<string>();

// Register our ALS-backed reader with the isomorphic reader module so
// logger + sentry (which run in both server and client bundles) can read
// the current ID without pulling this server-only module into browser code.
setCorrelationIdReader(() => correlationIdStore.getStore());

/** Generate a new correlation id. Short enough to be log-friendly. */
export function generateCorrelationId(): string {
  // Strip hyphens for log compactness; still 32 hex chars = 128 bits.
  return randomUUID().replace(/-/g, '');
}

/** Read the current correlation id, or undefined if no context is active. */
export function getCorrelationId(): string | undefined {
  return correlationIdStore.getStore();
}

/**
 * Ensure there is a correlation id in scope. Returns the existing one if
 * set, otherwise generates and registers a new one for the duration of
 * `fn`. Use this at HTTP entry points so downstream code always sees a
 * stable ID whether or not the caller set one.
 */
export function withCorrelationId<T>(
  id: string | undefined,
  fn: () => T
): T {
  const resolved = id ?? getCorrelationId() ?? generateCorrelationId();
  return correlationIdStore.run(resolved, fn);
}

/**
 * Run `fn` inside a context with the given correlation id (auto-generated
 * if not supplied). Returns the id that was active so callers can log it
 * or embed it in outgoing payloads.
 */
export function runWithCorrelationId<T>(
  fn: (id: string) => T,
  id?: string
): T {
  const resolved = id ?? getCorrelationId() ?? generateCorrelationId();
  return correlationIdStore.run(resolved, () => fn(resolved));
}
