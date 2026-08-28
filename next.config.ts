import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { validateRuntimeEnvironment } from './src/lib/runtime-environment';

validateRuntimeEnvironment(process.env);

/**
 * Standalone build.
 *
 * The upstream config was 338 lines: a Sentry wrapper, the Fumadocs MDX plugin,
 * a deploy-id build guard, a Ghost CMS rewrite, and a long remote-image
 * allowlist for the marketing site. A local tool needs none of it.
 *
 * https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Keep server-only Node packages out of the client bundle.
  serverExternalPackages: ['postgres', 'ioredis'],

  experimental: {
    /**
     * A saved keyword bundle is one server action carrying 285 merged rows.
     * Stripped of the per-row provider records it is around 600KB, which the
     * 1MB default rejects outright once a broad seed returns more rows. Four
     * megabytes leaves room without inviting multi-megabyte writes; see
     * trimBundleForStorage, which does the actual shrinking.
     */
    serverActions: { bodySizeLimit: '4mb' },
  },

  images: {
    // Favicon lookups for saved research targets are the only remote images.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },

  // Security headers. X-Frame-Options is set in proxy.ts, not here.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

/**
 * https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#next-config
 */
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
