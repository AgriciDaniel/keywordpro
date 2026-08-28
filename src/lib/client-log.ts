/**
 * Client-side diagnostic logging.
 *
 * Upstream this POSTed structured events to `/api/client-log`, which forwarded
 * them to Axiom. There is no telemetry endpoint in the standalone build, so
 * events go to the browser console and only when explicitly enabled with
 * NEXT_PUBLIC_KEYWORD_PRO_DEBUG_LOGS=true.
 */
export type ClientLogContext = Record<string, unknown>;

const debugEnabled =
  process.env.NEXT_PUBLIC_KEYWORD_PRO_DEBUG_LOGS === 'true';

export function clientLog(event: string, context?: ClientLogContext): void {
  if (typeof window === 'undefined' || !debugEnabled) return;
  try {
    console.debug(`[${event}]`, context ?? {});
  } catch {
    /* swallow - non-critical */
  }
}
