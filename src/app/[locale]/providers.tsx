'use client';

import { QueryProvider } from '@/components/providers/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { websiteConfig } from '@/config/website';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
}

/**
 * Providers
 *
 * Standalone build: Sentry, the websocket provider, and the Fumadocs docs
 * provider are all gone. What remains is the query client, theme, and tooltips.
 */
export function Providers({ children }: ProvidersProps) {
  const defaultMode = websiteConfig.ui.mode?.defaultMode ?? 'system';

  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme={defaultMode}
        enableSystem={true}
        disableTransitionOnChange
      >
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
