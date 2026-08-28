import { websiteConfig } from '@/config/website';
import { defineRouting } from 'next-intl/routing';

export const DEFAULT_LOCALE = websiteConfig.i18n.defaultLocale;
export const LOCALES = Object.keys(websiteConfig.i18n.locales);

// The name of the cookie that is used to determine the locale
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

/**
 * Next.js internationalized routing
 *
 * https://next-intl.dev/docs/routing
 * https://github.com/amannn/next-intl/blob/main/examples/example-app-router/src/i18n/routing.ts
 */
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: LOCALES,
  // Default locale when no locale matches
  defaultLocale: DEFAULT_LOCALE,
  // Auto detect locale
  // https://next-intl.dev/docs/routing/middleware#locale-detection
  localeDetection: false,
  // Once a locale is detected, it will be remembered for
  // future requests by being stored in the NEXT_LOCALE cookie.
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
  },
  // Keyword Pro ships one interface language. Keep the locale as an internal
  // segment so `/keyword-pro` is canonical and can never bounce between the
  // public and default-locale forms.
  // https://next-intl.dev/docs/routing#locale-prefix
  localePrefix: 'never',
});
