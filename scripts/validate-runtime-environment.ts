import { loadEnvConfig } from '@next/env';
import { validateRuntimeEnvironment } from '../src/lib/runtime-environment';

loadEnvConfig(process.cwd());

try {
  validateRuntimeEnvironment(process.env);
  process.stdout.write('Startup configuration validated.\n');
} catch (error) {
  const message =
    error instanceof Error ? error.message : 'Invalid startup configuration.';
  process.stderr.write(`Startup configuration rejected: ${message}\n`);
  process.exit(1);
}
