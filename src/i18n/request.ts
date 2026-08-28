import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { getMessagesForLocale } from './messages';
import { routing } from './routing';

/**
 * i18n/request.ts can be used to provide configuration for server-only code,
 * i.e. Server Components, Server Actions & friends.
 * The configuration is provided via the getRequestConfig function.
 *
 * The configuration object is created once for each request by internally using React’s cache.
 * The first component to use internationalization will call the function defined with getRequestConfig.
 *
 * https://next-intl.dev/docs/usage/configuration
 * https://github.com/amannn/next-intl/blob/main/examples/example-app-router/src/i18n/request.ts
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  const requested = await requestLocale;

  // Ensure that the incoming `locale` is valid
  // https://next-intl.dev/blog/next-intl-4-0?s#strictly-typed-locale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // https://next-intl.dev/docs/usage/configuration#messages
  // If you have incomplete messages for a given locale and would like to use messages
  // from another locale as a fallback, you can merge the two accordingly.
  const messages = await getMessagesForLocale(locale);

  return {
    locale,
    messages,
  };
});
