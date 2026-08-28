/**
 * Structured Logger
 *
 * Provides consistent JSON-formatted logging for production debugging.
 * In development, uses human-readable format.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *
 *   // Basic usage
 *   logger.info('Something happened', { event: 'module.action', userId });
 *
 *   // Child logger with inherited context
 *   const log = logger.withContext({ module: 'eeat', userId, sessionId });
 *   log.info('Processing signals', { event: 'eeat.process', count: 5 });
 *   // → context includes module, userId, sessionId, event, count
 *
 *   // Error logging
 *   logger.catch('Operation failed', error, { event: 'module.error', id });
 */

// Correlation ID is read via an isomorphic registry. On the server the
// `correlation-id` module registers an ALS-backed reader; on the client
// nothing registers and this returns undefined - which is correct.
import { readCorrelationId } from './correlation-id-reader';

// DTR-33-L: hashEmail used to live here, but its `node:crypto` import made
// every client bundle that transitively imports `@/lib/logger` pull in the
// full `crypto-browserify` polyfill (~440KB) plus `vm-browserify`, which
// trips the production CSP `unsafe-eval` block. Moved to `@/lib/log-redact`.
// Server-side callers (ghl/email-sender, ghl/sync, github-org-sync/notifications)
// import it directly from there now. The logger itself never needed to host
// the helper - it was a re-export of convenience.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  /** OB-03-C: auto-stamped from AsyncLocalStorage when a correlation context is active. */
  correlationId?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const isProduction = process.env.NODE_ENV === 'production';

// ── Axiom Direct HTTP Ingest ──────────────────────────────────────────
// Bypasses Vercel Pro log drain restriction by pushing logs directly
// to Axiom's REST API. Free tier: 500GB/month, 30-day retention.
// Batches events and flushes every 2 seconds or when batch hits 50.
const AXIOM_TOKEN = process.env.AXIOM_TOKEN?.trim() || null;
const AXIOM_DATASET = process.env.AXIOM_DATASET?.trim() || null;
const AXIOM_BATCH_SIZE = 50;
const AXIOM_FLUSH_INTERVAL_MS = 2_000;
const axiomBatch: LogEntry[] = [];
let axiomFlushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushAxiom(): Promise<void> {
  if (!AXIOM_TOKEN || !AXIOM_DATASET || axiomBatch.length === 0) return;
  if (axiomFlushTimer) {
    clearTimeout(axiomFlushTimer);
    axiomFlushTimer = null;
  }
  const events = axiomBatch.splice(0, axiomBatch.length);
  // OB-04-H: every event is stamped with `service: 'main-app'` so cross-
  // service queries in Axiom (filter by service = one of main-app |
  // pipeline-worker | ws-server) behave uniformly. The pipeline-worker
  // and ws-server axiom.ts modules stamp their own service name.
  try {
    const res = await fetch(`https://api.axiom.co/v1/datasets/${AXIOM_DATASET}/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AXIOM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        events.map((e) => ({
          ...e,
          _time: e.timestamp,
          service: 'main-app',
          // Every event carries a `context` object even when empty so
          // Axiom filters like `context.event == "..."` behave uniformly
          // across events instead of returning "field missing" on events
          // that never set structured context.
          context: e.context ?? {},
        }))
      ),
    });
    // Log non-2xx so we don't silently drop ingest failures. Without this
    // a misconfigured dataset, expired token, or rate-limit would produce
    // zero observable signal - the app would just stop logging to Axiom
    // and we'd find out hours later. console.error survives in prod
    // (next.config.ts removeConsole is commented out).
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      // Use console directly - calling logger.error here would recurse.
      // eslint-disable-next-line no-console
      console.error(
        `[axiom-ingest] ${res.status} ${res.statusText} dropped=${events.length} body=${bodyText.slice(0, 200)}`
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[axiom-ingest] fetch threw dropped=${events.length} err=${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Force-flush any buffered Axiom log events. Use before returning from a
 * short-lived API route (e.g. internal persist-callback routes) where the
 * 2-second batch timer would otherwise be dropped when Vercel's serverless
 * runtime exits the function context. Adds ~50-100ms to the response only
 * when there are buffered events. Safe to call when AXIOM is unconfigured
 * (no-op).
 */
export function flushAxiomLogs(): Promise<void> {
  return flushAxiom();
}

function sendToAxiom(entry: LogEntry): void {
  if (!AXIOM_TOKEN || !AXIOM_DATASET) return;
  axiomBatch.push(entry);
  if (axiomBatch.length >= AXIOM_BATCH_SIZE) {
    // Fire-and-forget on size-trigger flush - caller doesn't expect a Promise.
    void flushAxiom();
  } else if (!axiomFlushTimer) {
    axiomFlushTimer = setTimeout(() => {
      axiomFlushTimer = null;
      void flushAxiom();
    }, AXIOM_FLUSH_INTERVAL_MS);
  }
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL;
  if (env && env in LOG_LEVEL_ORDER) return env as LogLevel;
  return isProduction ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getMinLevel()];
}

function formatLogEntry(entry: LogEntry): string {
  if (isProduction) {
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  const errorStr = entry.error
    ? `\n  Error: ${entry.error.message}${entry.error.stack ? `\n  Stack: ${entry.error.stack}` : ''}`
    : '';

  return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}${contextStr}${errorStr}`;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  const correlationId = readCorrelationId();
  if (correlationId) {
    entry.correlationId = correlationId;
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    };
  }

  return entry;
}

// ── Error Rate Spike Detection ─────────────────────────────────────────
// Tracks errors in a sliding window and fires a Discord alert when the
// threshold is exceeded. Only runs on long-lived processes (Railway).
const ERROR_SPIKE_THRESHOLD = 10; // errors within window to trigger alert
const ERROR_SPIKE_WINDOW_MS = 60_000; // 60 second window
const ERROR_SPIKE_COOLDOWN_MS = 300_000; // 5 min cooldown between alerts
const errorTimestamps: number[] = [];
let lastSpikeAlert = 0;
let lastErrorMessage = '';

function trackError(message: string): void {
  const now = Date.now();
  lastErrorMessage = message;
  errorTimestamps.push(now);

  // Prune old entries outside the window
  const cutoff = now - ERROR_SPIKE_WINDOW_MS;
  while (errorTimestamps.length > 0 && errorTimestamps[0] < cutoff) {
    errorTimestamps.shift();
  }

  // Check if we've exceeded the threshold
  if (
    errorTimestamps.length >= ERROR_SPIKE_THRESHOLD &&
    now - lastSpikeAlert > ERROR_SPIKE_COOLDOWN_MS
  ) {
    lastSpikeAlert = now;
    // Standalone build: error spikes are logged locally, not sent anywhere.
    console.warn(
      `[logger] error spike: ${errorTimestamps.length} errors in ${
        ERROR_SPIKE_WINDOW_MS / 1000
      }s. Last: ${lastErrorMessage}`,
    );
  }
}

function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): void {
  if (!shouldLog(level)) return;

  // Track errors for spike detection
  if (level === 'error') {
    trackError(message);
  }

  const entry = createLogEntry(level, message, context, error);
  const formatted = formatLogEntry(entry);

  // Push to Axiom (non-blocking, batched)
  sendToAxiom(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext, error?: Error) => void;
  error: (message: string, context?: LogContext, error?: Error) => void;
  catch: (message: string, error: unknown, context?: LogContext) => void;
  withContext: (baseContext: LogContext) => Logger;
}

function createLogger(baseContext?: LogContext): Logger {
  const mergeContext = (extra?: LogContext): LogContext | undefined => {
    if (!baseContext && !extra) return undefined;
    if (!baseContext) return extra;
    if (!extra) return baseContext;
    return { ...baseContext, ...extra };
  };

  const instance: Logger = {
    debug: (message: string, context?: LogContext) =>
      log('debug', message, mergeContext(context)),
    info: (message: string, context?: LogContext) =>
      log('info', message, mergeContext(context)),
    warn: (message: string, context?: LogContext, error?: Error) =>
      log('warn', message, mergeContext(context), error),
    error: (message: string, context?: LogContext, error?: Error) =>
      log('error', message, mergeContext(context), error),
    catch: (message: string, error: unknown, context?: LogContext) => {
      const err = error instanceof Error ? error : new Error(String(error));
      log('error', message, mergeContext(context), err);
    },
    withContext: (childContext: LogContext) =>
      createLogger(
        baseContext ? { ...baseContext, ...childContext } : childContext
      ),
  };

  return instance;
}

export const logger = createLogger();

// DTR-33-L: removed unused authLogger/dataLogger/adminLogger/apiLogger
// helper objects. They were exported but never imported anywhere - dead
// code that, when the loaders specialized helpers used hashEmail, kept
// the `node:crypto` import alive in logger.ts. Real callers use the base
// `logger` directly with their own `event:` strings.
