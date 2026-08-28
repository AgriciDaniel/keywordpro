import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { ProtectedScrollShell } from '@/components/layout/protected-scroll-shell';
import { WorkspaceCenterVars } from '@/components/layout/workspace-center-vars';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PageExitProvider } from '@/contexts/page-exit-context';
import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

export const maxDuration = 300;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * App shell.
 *
 * Standalone build: there is no authentication, so this layout no longer
 * validates a session or redirects to a login page. It renders the sidebar and
 * the scroll shell only.
 *
 * inspired by dashboard-01
 * https://ui.shadcn.com/blocks
 */
export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <PageExitProvider>
      <SidebarProvider
        className="min-h-svh"
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <DashboardSidebar variant="sidebar" />

        <SidebarInset className="flex flex-col h-dvh md:h-svh overflow-x-hidden overflow-y-hidden bg-[#1F1F1F]">
          <WorkspaceCenterVars />
          <ProtectedScrollShell railOffsetPx={0}>
            {children}
          </ProtectedScrollShell>
        </SidebarInset>
      </SidebarProvider>
    </PageExitProvider>
  );
}
