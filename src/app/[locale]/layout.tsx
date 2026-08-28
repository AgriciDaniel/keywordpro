import { fontNotoSans, fontNotoSansMono, fontNotoSerif } from '@/assets/fonts';
import { SkipLink } from '@/components/layout/skip-link';
import { TailwindIndicator } from '@/components/layout/tailwind-indicator';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { type Locale, NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Providers } from './providers';

import '@/styles/globals.css';

/**
 * Viewport configuration for mobile optimization
 * https://nextjs.org/docs/app/api-reference/functions/generate-viewport
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#141414' },
  ],
};

/**
 * PWA / mobile-web-app install signals.
 * Next.js auto-emits <link rel="manifest"> from app/manifest.ts and
 * renders apple-mobile-web-app-* meta tags from metadata.appleWebApp.
 * https://nextjs.org/docs/app/api-reference/functions/generate-metadata#applewebapp
 */
export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  applicationName: 'Keyword Pro',
  appleWebApp: {
    capable: true,
    title: 'Keyword Pro',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}

/**
 * 1. Locale Layout
 * https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#layout
 *
 * 2. NextIntlClientProvider
 * https://next-intl.dev/docs/usage/configuration#nextintlclientprovider
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering for this layout
  // https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#static-rendering
  setRequestLocale(locale);

  return (
    <html suppressHydrationWarning lang={locale} data-scroll-behavior="smooth">
      <head>
      </head>
      <body
        suppressHydrationWarning
        className={cn(
          'size-full antialiased',
          fontNotoSans.className,
          fontNotoSerif.variable,
          fontNotoSansMono.variable
        )}
      >
        {/* Skip Navigation Link for Accessibility */}
        <SkipLink />

        <NuqsAdapter>
          <NextIntlClientProvider>
            <Providers locale={locale}>
              <main id="main-content" tabIndex={-1} className="outline-none" suppressHydrationWarning>
                {children}
              </main>

              <Toaster richColors position="top-right" offset={64} />
              <TailwindIndicator />
            </Providers>
          </NextIntlClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
