'use client';

/**
 * BreadcrumbContext - shared breadcrumb state that persists across route changes.
 *
 * The DashboardHeader renders in a parent layout that never unmounts during
 * gallery ↔ project ↔ detail view navigation. Child pages/layouts call
 * setBreadcrumbs() to update the header text, which morphs smoothly via
 * BreadcrumbMorph without any flash or re-mount.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  isCurrentPage?: boolean;
  onClick?: () => void;
}

interface BreadcrumbContextValue {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  /** Force a re-morph animation even if the text hasn't changed. */
  remorphBreadcrumbs: () => void;
  /**
   * Monotonically increasing counter bumped by remorphBreadcrumbs().
   * BreadcrumbMorph watches this and plays a single same-text crossfade
   * whenever it changes. We use a counter rather than the old
   * zero-width-space trick - that trick produced TWO crossfades (one for
   * "X" → "X​", one for "X​" → "X"), which looked like a double flourish.
   */
  replayKey: number;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function useBreadcrumbs(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return ctx;
}

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { label: 'Projects', isCurrentPage: true },
  ]);
  const [replayKey, setReplayKey] = useState(0);

  const remorphBreadcrumbs = useCallback(() => {
    setReplayKey((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ breadcrumbs, setBreadcrumbs, remorphBreadcrumbs, replayKey }),
    [breadcrumbs, remorphBreadcrumbs, replayKey],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}
