import { logger } from './lib/logger';

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Standalone build: the only hard requirements are a database and a key to
    // encrypt stored credentials with. No auth secret, no Stripe, no Sentry.
    const requiredEnvVars = ['DATABASE_URL', 'DATABASE_SSL_MODE'];
    const missing = requiredEnvVars.filter((key) => !process.env[key]?.trim());

    if (missing.length > 0) {
      logger.error('Missing required environment variables', {
        event: 'startup.envMissing',
        missing,
      });
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }

    // Presence is not validity. Import Node-only validators only in the Node
    // instrumentation bundle and reject bad database transport or credential
    // encryption material before request handling.
    const [{ validateRuntimeEnvironment }, { validateEncryptionConfig }] =
      await Promise.all([
        import('./lib/runtime-environment'),
        import('./keyword-pro/crypto'),
      ]);
    try {
      validateRuntimeEnvironment(process.env);
      validateEncryptionConfig();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid runtime environment configuration.';
      logger.error('Runtime environment validation failed', {
        event: 'startup.envInvalid',
        message,
      });
      throw error;
    }

    const optionalWarnings: string[] = [];
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      optionalWarnings.push('DataForSEO credentials (or add them in Connections)');
    }
    if (!process.env.REDIS_URL) {
      optionalWarnings.push('REDIS_URL (idempotency falls back to in-process cache)');
    }

    if (optionalWarnings.length > 0) {
      logger.warn(
        'Missing optional environment variables (some features may be limited)',
        {
          event: 'startup.envOptionalMissing',
          missing: optionalWarnings,
        },
      );
    }

    logger.info('Environment validation passed', { event: 'startup.envValidated' });
  }
}
