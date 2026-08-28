/**
 * Correlation ID Reader (OB-03-C)
 *
 * Isomorphic read-only surface for the correlation ID. Imported by modules
 * that run in BOTH server and client/edge bundles (logger, sentry adapter)
 * so they can attach a correlation ID to log lines / Sentry events without
 * pulling the server-only AsyncLocalStorage implementation into browser
 * bundles.
 *
 * On the server, `correlation-id.ts` imports this module and registers its
 * ALS-backed reader. On the client / edge, no reader is registered and
 * `readCorrelationId()` always returns undefined - which is the correct
 * behavior since there is no server-scoped request context to read from.
 */

type Reader = () => string | undefined;

let reader: Reader | null = null;

/** Called by the server-only correlation-id module during its init. */
export function setCorrelationIdReader(fn: Reader): void {
  reader = fn;
}

/** Returns the current correlation ID, or undefined if none is registered. */
export function readCorrelationId(): string | undefined {
  return reader?.();
}
