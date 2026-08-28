'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { LocaleLink } from '@/i18n/navigation';
import type { SidebarNavigationIntentInput } from '@/lib/sidebar-navigation-authority';
import { Routes } from '@/routes';
import { Plug } from 'lucide-react';
import type { MouseEvent } from 'react';

interface SidebarConnectionsProps {
  onNavigate?: (input: SidebarNavigationIntentInput) => unknown;
}

/**
 * Foot of the sidebar.
 *
 * This slot used to hold an account row (avatar, name, email) opening a menu
 * of Profile and Connections. There is no account system in this build, so the
 * row said nothing worth a click and Profile duplicated settings that live on
 * the settings page. Connections now sits in that slot directly, one click
 * instead of two. `/settings/profile` still exists; nothing links to it.
 */
export function SidebarConnections({ onNavigate }: SidebarConnectionsProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate({
      kind: 'settings',
      reason: 'sidebar-connections',
      url: Routes.SettingsConnections,
    });
  };

  return (
    <SidebarMenu className="border-t pt-3">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Connections"
          className="cursor-pointer rounded-xl hover:bg-[#2A2A2A] hover:text-[#E2E2E5] active:bg-[#2A2A2A] active:text-[#E2E2E5] focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <LocaleLink href={Routes.SettingsConnections} onClick={handleClick}>
            <Plug className="size-4 shrink-0" />
            {!isCollapsed && (
              <span className="truncate text-[#E2E2E5]">Connections</span>
            )}
          </LocaleLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
