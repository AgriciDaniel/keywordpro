/**
 * Config types for the standalone build.
 *
 * Trimmed alongside `src/config/website.tsx`: the pricing, credits, payment,
 * auth-provider, blog, docs, mail, newsletter and storage sections are gone.
 */
export type WebsiteConfig = {
  ui: UiConfig;
  metadata: MetadataConfig;
  routes: RoutesConfig;
  i18n: I18nConfig;
};

export interface UiConfig {
  mode?: ModeConfig;
}

export interface ModeConfig {
  defaultMode?: 'light' | 'dark' | 'system';
  enableSwitch?: boolean;
}

export interface MetadataConfig {
  images?: ImagesConfig;
}

export interface ImagesConfig {
  ogImage?: string;
  logoLight?: string;
  logoDark?: string;
}

export interface RoutesConfig {
  defaultLoginRedirect: string;
}

export interface I18nConfig {
  defaultLocale: string;
  locales: Record<string, LocaleConfig>;
}

export interface LocaleConfig {
  flag?: string;
  name: string;
}
