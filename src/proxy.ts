import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from './i18n/routing';
import { DEFAULT_REDIRECT } from './routes';

/**
 * Request proxy (Next.js middleware).
 *
 * Standalone build. The upstream version was 1,216 lines: cross-host routing
 * between a marketing domain and an app subdomain, a Ghost CMS admin proxy,
 * auth-cookie redirects, deployment-id staleness rejection, device-id cookies,
 * and a cache policy that chose between no-store and public edge caching based
 * on `isProtectedRoute || isLoggedIn`.
 *
 * None of that applies to a single-origin local tool. What remains is locale
 * routing plus security headers.
 *
 * Note on caching: every HTML response is pinned to `no-store`. Removing the
 * auth check without pinning this would have silently flipped the app to
 * publicly cacheable.
 */

function buildCspHeader(isProduction: boolean): string {
  const scriptSrc = isProduction
    ? `script-src 'self' 'unsafe-inline'`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval'`;
  const connectSrc = isProduction
    ? `connect-src 'self'`
    : `connect-src 'self' ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*`;

  const directives = [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https:`,
    // Provider calls stay server-side. Development WebSockets are added only
    // for local hot reload and are absent from production responses.
    connectSrc,
    `media-src 'self' blob: data: https:`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `worker-src 'self' blob:`,
  ];

  return directives.join('; ');
}

function addSecurityHeaders(
  response: NextResponse,
  isProduction: boolean,
): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set(
    'Cross-Origin-Opener-Policy',
    'same-origin-allow-popups',
  );
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', buildCspHeader(isProduction));

  // Local-only tool: never cache HTML.
  response.headers.set(
    'Cache-Control',
    'private, no-store, no-cache, must-revalidate',
  );

  return response;
}

export default function proxy(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const { nextUrl } = req;
  const internalLocalePrefix = `/${DEFAULT_LOCALE}`;

  // Internal rewrites pass through the proxy once more. Let the locale-prefixed
  // route continue or the proxy would prepend `/en` until the request fails.
  if (
    nextUrl.pathname === internalLocalePrefix ||
    nextUrl.pathname.startsWith(`${internalLocalePrefix}/`)
  ) {
    return addSecurityHeaders(NextResponse.next(), isProduction);
  }

  if (nextUrl.pathname === '/') {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = DEFAULT_REDIRECT;
    return addSecurityHeaders(
      NextResponse.redirect(redirectUrl, 307),
      isProduction,
    );
  }

  // Strip trailing slashes so /keyword-pro/ and /keyword-pro are one route.
  if (nextUrl.pathname !== '/' && nextUrl.pathname.endsWith('/')) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = nextUrl.pathname.replace(/\/+$/, '') || '/';
    return addSecurityHeaders(
      NextResponse.redirect(redirectUrl, 308),
      isProduction,
    );
  }

  // The app has one interface locale, kept as an internal route segment. A
  // direct rewrite avoids the default-locale redirect loop that can occur when
  // next-intl's public prefix handling is combined with Next.js proxy rewrites.
  const rewriteUrl = nextUrl.clone();
  rewriteUrl.pathname = `/${DEFAULT_LOCALE}${nextUrl.pathname}`;
  const response = NextResponse.rewrite(rewriteUrl);
  response.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_LOCALE, {
    path: '/',
    sameSite: 'lax',
  });
  return addSecurityHeaders(response, isProduction);
}

/**
 * Next.js internationalized routing
 * https://next-intl.dev/docs/routing#base-path
 */
export const config = {
  matcher: [
    // Match all pathnames except for
    // - if they start with `/api`, `/_next` or `/_vercel`
    // - if they contain a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
