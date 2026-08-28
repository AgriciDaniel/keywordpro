import type { WebsiteConfig } from '@/types';

/**
 * Website config for the standalone build.
 *
 * The upstream version carried Stripe price tables, credit packages, per-provider
 * usage pricing, auth provider toggles, blog/docs/newsletter settings and eight
 * required NEXT_PUBLIC_STRIPE_PRICE_* env vars that threw at module load.
 * None of that applies to a local single-user tool, so this is the whole config now.
 */
export const websiteConfig: WebsiteConfig = {
  ui: {
    mode: {
      defaultMode: 'dark',
      enableSwitch: false,
    },
  },
  metadata: {
    images: {
      ogImage: '/images/og-keyword-pro.png',
      logoLight: '/images/logo-keyword-pro.svg',
      logoDark: '/images/logo-keyword-pro.svg',
    },
  },
  routes: {
    defaultLoginRedirect: '/keyword-pro',
  },
  i18n: {
    defaultLocale: 'en',
    locales: {
      en: {
        flag: '🇺🇸',
        name: 'English',
      },
    },
  },
};
