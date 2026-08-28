'use client';

/**
 * PageExitContext - centralised "play exit animation, then navigate"
 * pattern. Makes every cross-page navigation under /keyword-pro feel
 * consistent and intentional instead of jump-cutting.
 *
 * Why this exists:
 *   Different pages own different exit animations (Gallery does a
 *   reverse-stagger across its cards, ProjectLayout fades its content
 *   block, Article view has its own lifecycle). Before this context,
 *   only Gallery→Project used its exit, because Gallery's own click
 *   handler played the animation before calling router.push. Every other
 *   navigation (sidebar buttons, breadcrumbs, article clicks) bypassed
 *   the exit entirely and jump-cut to the next screen.
 *
 * How it works:
 *   The currently-mounted page registers a single exit handler via
 *   useRegisterPageExit(fn). Any code that wants to navigate away (a
 *   sidebar button, breadcrumb, project card, etc.) calls
 *   navigateWithExit(url) or replaceWithExit(url). The context awaits
 *   the registered handler (letting the page play its staggered
 *   fade-out) and then commits the route. If no handler is registered,
 *   it falls back to an immediate route commit so random links don't
 *   stall.
 *
 * Semantics:
 *   - Handlers form a priority registry. Child surfaces that must own a
 *     smaller visual region (article body under the step bar) register
 *     with a higher priority than parent wrappers (project workspace).
 *     Ties prefer the newest registration. When the active handler
 *     unregisters, the next best handler becomes active automatically.
 *   - Handlers may return void or Promise<void>. navigateWithExit awaits
 *     whichever is returned.
 *   - A 700ms timeout wraps the handler - if a page's exit animation
 *     stalls for any reason, navigation still completes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useLocaleRouter } from '@/i18n/navigation';
import { LOCALES } from '@/i18n/routing';
import { clientLog } from '@/lib/client-log';

type ExitHandler = () => Promise<void> | void;
type PageExitNavigationMode = 'push' | 'replace';

interface ExitHandlerRegistration {
  handler: ExitHandler;
  priority: number;
  seq: number;
}

interface PageExitContextValue {
  /**
   * Register the current page's exit handler. Returns an unregister
   * function - call in effect cleanup. Typical usage via the
   * useRegisterPageExit hook.
   */
  registerExitHandler: (handler: ExitHandler, priority?: number) => () => void;
  /**
   * Navigate to the target URL, playing the registered page's exit
   * animation first (if any). Falls back to immediate push if no handler
   * is registered or the handler stalls >700ms.
   */
  navigateWithExit: (url: string) => void;
  /**
   * Replace the current URL after the registered page exit animation.
   * Use this for transient staging routes, such as /article/new after
   * the selected topic has created a durable article row.
   */
  replaceWithExit: (url: string) => void;
}

const PageExitContext = createContext<PageExitContextValue | null>(null);

const EXIT_TIMEOUT_MS = 700;

/**
 * "Clicking the route you're already on is a flourish, not a navigation."
 *
 * Compares the resolved target URL to window.location. If pathname +
 * search match (trailing slashes normalized, empty query treated as
 * missing), we're re-clicking the current route - the caller should fire
 * a breadcrumb flourish instead of triggering the exit-then-push cycle,
 * because pushing to the same URL doesn't fire the pathname reset effect
 * and the page stays faded out.
 *
 * Locale prefix is stripped from BOTH sides before comparing. The URL
 * passed to navigateWithExit is typically pre-locale (e.g.
 * `/keyword-pro/research/X`), while window.location.pathname
 * includes the locale for non-default locales (e.g. `/zh/...`). Without
 * this normalization the comparison never matches and the flourish
 * never fires. `localePrefix: 'as-needed'` means English is naked, but
 * everything else is prefixed.
 *
 * Hash is ignored - same-page scroll anchors aren't "navigation" anyway.
 */
function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split('/');
  if (parts[1] && LOCALES.includes(parts[1])) {
    const rest = '/' + parts.slice(2).join('/');
    return rest === '' ? '/' : rest;
  }
  return pathname;
}

export function isSameRouteAsCurrent(target: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const targetUrl = new URL(target, window.location.origin);
    const norm = (p: string) =>
      (stripLocalePrefix(p).replace(/\/+$/, '') || '/');
    const samePath = norm(targetUrl.pathname) === norm(window.location.pathname);
    const sameQuery = (targetUrl.search || '') === (window.location.search || '');
    return samePath && sameQuery;
  } catch {
    return false;
  }
}

export function PageExitProvider({ children }: { children: ReactNode }) {
  const router = useLocaleRouter();
  // Router inside callbacks that may run after re-renders. A ref keeps
  // us referencing the latest instance without re-creating the memoized
  // context value every render.
  const routerRef = useRef(router);
  routerRef.current = router;

  // Priority registry. Parents and children may mount effects in an order
  // React does not promise for our UX contract, so active ownership is
  // explicit rather than inferred from effect order.
  const stackRef = useRef<ExitHandlerRegistration[]>([]);
  const navigationSeqRef = useRef(0);
  const registrationSeqRef = useRef(0);

  const getActiveRegistration = useCallback(
    (registrations: ExitHandlerRegistration[]) =>
      registrations.reduce<ExitHandlerRegistration | null>((best, candidate) => {
        if (!best) return candidate;
        if (candidate.priority > best.priority) return candidate;
        if (candidate.priority === best.priority && candidate.seq > best.seq) {
          return candidate;
        }
        return best;
      }, null),
    [],
  );

  const registerExitHandler = useCallback((handler: ExitHandler, priority = 0) => {
    const registration: ExitHandlerRegistration = {
      handler,
      priority,
      seq: registrationSeqRef.current + 1,
    };
    registrationSeqRef.current = registration.seq;
    stackRef.current.push(registration);
    clientLog('client.pageExit.handlerRegistered', {
      stackDepth: stackRef.current.length,
      priority,
    });
    return () => {
      const idx = stackRef.current.indexOf(registration);
      if (idx >= 0) stackRef.current.splice(idx, 1);
      clientLog('client.pageExit.handlerUnregistered', {
        stackDepth: stackRef.current.length,
        priority,
      });
    };
  }, []);

  const commitRoute = useCallback(
    (mode: PageExitNavigationMode, url: string) => {
      if (mode === 'replace') {
        routerRef.current.replace(url, { scroll: false });
        return;
      }
      routerRef.current.push(url);
    },
    [],
  );

  const navigateWithExitMode = useCallback((url: string, mode: PageExitNavigationMode) => {
    const navigationSeq = navigationSeqRef.current + 1;
    navigationSeqRef.current = navigationSeq;
    clientLog('client.pageExit.navigateRequested', {
      fromUrl:
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : null,
      targetUrl: url,
      navigationMode: mode,
      stackDepth: stackRef.current.length,
      navigationSeq,
    });

    // PRINCIPLE: clicking the route you're already on is a flourish, not
    // a navigation. Fire a breadcrumb flourish and return early. Every
    // sidebar/breadcrumb/button that routes through navigateWithExit
    // inherits this behavior automatically - no per-callsite same-page
    // guards required.
    if (isSameRouteAsCurrent(url)) {
      if (typeof window !== 'undefined') {
        clientLog('client.pageExit.sameRouteRemorph', {
          targetUrl: url,
          navigationMode: mode,
          stackDepth: stackRef.current.length,
          navigationSeq,
        });
        window.dispatchEvent(new Event('keyword-pro:remorph-breadcrumbs'));
      }
      return;
    }

    const routerWithPrefetch = routerRef.current as typeof routerRef.current & {
      prefetch?: (href: string) => void;
    };
    routerWithPrefetch.prefetch?.(url);

    const stack = stackRef.current;
    const activeRegistration = getActiveRegistration(stack);
    if (!activeRegistration) {
      clientLog(
        mode === 'replace' ? 'client.pageExit.replace' : 'client.pageExit.push',
        {
          targetUrl: url,
          navigationMode: mode,
          reason: 'no-handler',
          stackDepth: stack.length,
          navigationSeq,
        }
      );
      commitRoute(mode, url);
      return;
    }
    const { handler } = activeRegistration;
    let navigated = false;
    const go = (reason: string) => {
      if (navigated) return;
      if (navigationSeq !== navigationSeqRef.current) {
        clientLog('client.pageExit.staleNavigationIgnored', {
          targetUrl: url,
          reason,
          stackDepth: stack.length,
          navigationSeq,
          latestNavigationSeq: navigationSeqRef.current,
        });
        return;
      }
      navigated = true;
      clientLog(
        mode === 'replace' ? 'client.pageExit.replace' : 'client.pageExit.push',
        {
          targetUrl: url,
          navigationMode: mode,
          reason,
          stackDepth: stack.length,
          navigationSeq,
        }
      );
      commitRoute(mode, url);
    };
    // Safety net: if the page's handler throws or stalls, still navigate.
    const timeout = setTimeout(() => {
      clientLog('client.pageExit.handlerTimeout', {
        targetUrl: url,
        timeoutMs: EXIT_TIMEOUT_MS,
        stackDepth: stack.length,
        handlerPriority: activeRegistration.priority,
        navigationSeq,
      });
      go('handler-timeout');
    }, EXIT_TIMEOUT_MS);
    Promise.resolve()
      .then(() => {
        clientLog('client.pageExit.handlerStart', {
          targetUrl: url,
          stackDepth: stack.length,
          handlerPriority: activeRegistration.priority,
          navigationSeq,
        });
        return handler();
      })
      .then(() => {
        clearTimeout(timeout);
        clientLog('client.pageExit.handlerComplete', {
          targetUrl: url,
          stackDepth: stack.length,
          handlerPriority: activeRegistration.priority,
          navigationSeq,
        });
        go('handler-complete');
      })
      .catch((err) => {
        clearTimeout(timeout);
        clientLog('client.pageExit.handlerError', {
          targetUrl: url,
          error: err instanceof Error ? err.message : String(err),
          stackDepth: stack.length,
          handlerPriority: activeRegistration.priority,
          navigationSeq,
        });
        go('handler-error');
      });
  }, [commitRoute, getActiveRegistration]);

  const navigateWithExit = useCallback(
    (url: string) => navigateWithExitMode(url, 'push'),
    [navigateWithExitMode],
  );

  const replaceWithExit = useCallback(
    (url: string) => navigateWithExitMode(url, 'replace'),
    [navigateWithExitMode],
  );

  const value = useMemo(
    () => ({ registerExitHandler, navigateWithExit, replaceWithExit }),
    [registerExitHandler, navigateWithExit, replaceWithExit],
  );

  return (
    <PageExitContext.Provider value={value}>
      {children}
    </PageExitContext.Provider>
  );
}

/**
 * Strict hook - call from pages/sidebars that live inside the provider.
 */
export function usePageExit(): PageExitContextValue {
  const ctx = useContext(PageExitContext);
  if (!ctx) {
    throw new Error('usePageExit must be used inside PageExitProvider');
  }
  return ctx;
}

/**
 * Non-throwing variant for components that can render outside the
 * provider (storybook, tests, public marketing pages). Falls back to
 * direct navigation when called from those contexts.
 */
export function useOptionalPageExit(): PageExitContextValue | null {
  return useContext(PageExitContext);
}

/**
 * Register the current page's exit handler for its entire lifetime.
 *
 * Pattern:
 *   useRegisterPageExit(useCallback(async () => {
 *     setIsLeaving(true);
 *     await new Promise((r) => setTimeout(r, EXIT_MS));
 *   }, []));
 *
 * The handler is always kept in a ref so changes to the callback
 * identity don't re-register. That means even non-memoized handlers are
 * safe - but prefer useCallback to avoid unrelated re-renders.
 */
export function useRegisterPageExit(handler: ExitHandler, priority = 0): void {
  const ctx = useOptionalPageExit();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!ctx) return;
    return ctx.registerExitHandler(() => handlerRef.current(), priority);
  }, [ctx, priority]);
}
