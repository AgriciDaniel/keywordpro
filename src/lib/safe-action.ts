import { createSafeActionClient } from 'next-safe-action';
import type { User } from './auth-types';
import {
  getCorrelationId,
  runWithCorrelationId,
} from './correlation-id';
import { getSession } from './server';

/**
 * OB-10-M (2026-04-19): every server-action failure response carries a
 * `correlationId` - a single token users can paste into a support ticket
 * so ops can grep every log line, Sentry event, job payload, and
 * ws-notify event tied to the failing action.
 *
 * Propagation:
 *   1. Base middleware wraps each action in `runWithCorrelationId`, which
 *      installs a fresh id into AsyncLocalStorage for the duration of the
 *      call. Downstream consumers (logger, Sentry, job enqueue,
 *      ws-notify) pick it up automatically via `getCorrelationId()`.
 *   2. next-safe-action catches thrown errors at the middleware
 *      boundary - `await next()` returns the result envelope rather than
 *      propagating the throw. `handleServerError` runs INSIDE the
 *      middleware's ALS scope, so it can read the id via
 *      `getCorrelationId()` and embed it in the serverError payload.
 *   3. Unauthorized paths (userActionClient / adminActionClient) return
 *      their own success:false shapes - they also read from ALS so the
 *      id appears in those responses too.
 */

// -----------------------------------------------------------------------------
// 1. Base action client – put global error handling / metadata here if needed
// -----------------------------------------------------------------------------
export const actionClient = createSafeActionClient({
  handleServerError: (e) => {
    // handleServerError runs inside the middleware's runWithCorrelationId
    // scope, so getCorrelationId() returns the id for this request.
    const correlationId = getCorrelationId();

    if (e instanceof Error) {
      return {
        success: false,
        error: e.message,
        correlationId,
      };
    }

    return {
      success: false,
      error: 'Something went wrong while executing the action',
      correlationId,
    };
  },
}).use(async ({ next }) => {
  // Wrap every action in a correlation-id context. ALS automatically
  // follows the async callstack, so deeply-nested code can read the id
  // without per-call-site plumbing.
  return runWithCorrelationId(async () => {
    return await next();
  });
});

// -----------------------------------------------------------------------------
// 2. User-scoped client
// -----------------------------------------------------------------------------
//
// Standalone build: there is no authentication. This middleware injects the
// single seeded local user so existing `ctx.user.id` call sites keep working
// unchanged. It still throws when the seed has not run, because every
// downstream write needs a real `user.id` to satisfy its foreign key.
//
// OB-10-M note: next-safe-action v8 middlewares that short-circuit with
// `return { success: false, error: '...' }` instead of throwing produce an
// empty `{}` result envelope (no `.data`, no `.serverError`). We throw so
// the failure flows through the base client's `handleServerError`, which
// emits the canonical `{ success, error, correlationId }` shape.
export const userActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession();
  if (!session?.user) {
    throw new Error(
      'No local user row found. Run `pnpm seed` before using the app.',
    );
  }

  return next({ ctx: { user: session.user as User } });
});
