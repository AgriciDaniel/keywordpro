/**
 * The routes for the application.
 *
 * Standalone build: the marketing pages, auth pages, admin tree, billing and
 * CLI routes are gone, and with no authentication there is nothing to protect,
 * so `protectedRoutes` and `routesNotAllowedByLoggedInUsers` are gone too.
 */
export enum Routes {
  // keyword console
  KeywordPro = '/keyword-pro',

  // settings
  SettingsProfile = '/settings/profile',
  SettingsConnections = '/settings/connections',
}

/**
 * Where "/" sends you.
 */
export const DEFAULT_REDIRECT: string = Routes.KeywordPro;
