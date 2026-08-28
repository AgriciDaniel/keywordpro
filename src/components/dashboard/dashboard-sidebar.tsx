'use client';

import { ResearchSidebar } from '@/components/ResearchSidebar';
import { SidebarConnections } from '@/components/dashboard/sidebar-connections';
import { Logo } from '@/components/layout/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useLocaleRouter } from '@/i18n/navigation';
import type { ResearchSessionSummary } from '@/lib/research/console-types';
import type {
  SidebarNavigationIntent,
  SidebarNavigationIntentInput,
} from '@/lib/sidebar-navigation-authority';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { usePathname } from 'next/navigation';
import { useCallback, useState, type ComponentProps } from 'react';

const appName = 'Keyword';
const appQualifier = 'Pro';

/**
 * Dashboard sidebar.
 *
 * Standalone build. The upstream version was 1,408 lines built around a project
 * selector, an article gallery, a legacy project bridge and a page-exit
 * navigation authority. There are no projects or articles here, so the sidebar
 * is the logo, the research session list, and a link to Connections.
 */
export function DashboardSidebar({
  ...props
}: ComponentProps<typeof Sidebar>) {
  const router = useLocaleRouter();
  const pathname = usePathname() ?? '';
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const routedResearchSessionId =
    pathname.match(/\/keyword-pro\/research\/([^/]+)/)?.[1] ?? null;

  // The navigation-authority indirection is gone; nav is a plain push. The
  // callback shape is kept because the footer link still takes an onNavigate.
  const navigate = useCallback(
    (input: SidebarNavigationIntentInput): SidebarNavigationIntent => {
      router.push(input.url);
      return { ...input, seq: 0 } as SidebarNavigationIntent;
    },
    [router],
  );

  const handleNewResearch = useCallback(() => {
    router.push(Routes.KeywordPro);
    setRefreshTrigger((n) => n + 1);
  }, [router]);

  const handleSelectResearch = useCallback(
    (researchSession: ResearchSessionSummary) => {
      router.push(`${Routes.KeywordPro}/research/${researchSession.id}`);
    },
    [router],
  );

  const handleDeletedResearch = useCallback(
    (researchSession: ResearchSessionSummary) => {
      if (routedResearchSessionId === researchSession.id) {
        router.push(Routes.KeywordPro);
      }
      setRefreshTrigger((n) => n + 1);
    },
    [routedResearchSessionId, router],
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="relative z-20 px-3 pt-3">
        <div className="w-full border-sidebar-border/70 border-b pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <button
                type="button"
                onClick={handleNewResearch}
                title="New keyword research"
                className={cn(
                  'flex h-8 w-full items-center gap-2 rounded-md transition-colors',
                  'cursor-pointer hover:bg-white/[0.055]',
                  isCollapsed ? 'justify-center px-0' : 'px-1.5',
                )}
              >
                <Logo
                  className={cn(
                    'text-[#F4F1EA]',
                    isCollapsed ? 'size-7' : undefined,
                  )}
                />
                {!isCollapsed && (
                  // Two weights on one line: the name carries the size, the
                  // qualifier stays small so it reads as a suffix rather than
                  // a second word competing with it.
                  <span className="flex min-w-0 items-baseline gap-1.5 truncate font-semibold text-[#F4F1EA] tracking-tight">
                    <span className="truncate text-xl leading-none">
                      {appName}
                    </span>
                    <span className="text-base leading-none text-[#F4F1EA]/65">
                      {appQualifier}
                    </span>
                  </span>
                )}
              </button>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10 flex flex-col overflow-visible px-3">
        <div
          className={cn(
            'flex w-full flex-1 min-h-0 flex-col',
            isCollapsed ? 'items-center gap-3 py-3' : 'gap-2 pt-3',
          )}
        >
          <ResearchSidebar
            activeResearchSessionId={routedResearchSessionId}
            isCollapsed={isCollapsed}
            onDeletedResearch={handleDeletedResearch}
            onNewResearch={handleNewResearch}
            onSelectResearch={handleSelectResearch}
            projectId={null}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-3 px-3 pb-3 pt-2">
        <SidebarConnections onNavigate={navigate} />
      </SidebarFooter>
    </Sidebar>
  );
}
