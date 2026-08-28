'use client';

/**
 * Keyword Pro layout persists across console and report navigation.
 *
 * Owns the DashboardHeader + BreadcrumbProvider so the header component
 * instance never unmounts during route changes. Child pages and layouts
 * call setBreadcrumbs() to update the header text - BreadcrumbMorph
 * handles the smooth text animation.
 */

import { BreadcrumbProvider, useBreadcrumbs } from '@/contexts/breadcrumb-context';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useEffect, type ReactNode } from 'react';

export default function KeywordProLayout({ children }: { children: ReactNode }) {
  return (
    <BreadcrumbProvider>
      <KeywordProLayoutInner>{children}</KeywordProLayoutInner>
    </BreadcrumbProvider>
  );
}

function KeywordProLayoutInner({ children }: { children: ReactNode }) {
  const { breadcrumbs, remorphBreadcrumbs, replayKey } = useBreadcrumbs();

  // Listen for remorph requests (e.g. clicking "Projects" while already on gallery)
  useEffect(() => {
    const handler = () => remorphBreadcrumbs();
    window.addEventListener('keyword-pro:remorph-breadcrumbs', handler);
    return () => window.removeEventListener('keyword-pro:remorph-breadcrumbs', handler);
  }, [remorphBreadcrumbs]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-transparent font-sans text-foreground dark">
      <main className="relative flex min-h-0 flex-1 flex-col">
        <DashboardHeader breadcrumbs={breadcrumbs} replayKey={replayKey} />
        {children}
      </main>
    </div>
  );
}
