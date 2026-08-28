import { loadEnvConfig } from '@next/env';
import { migrateDatabase } from '../src/db/migrate';

loadEnvConfig(process.cwd());

migrateDatabase({ env: process.env })
  .then((result) => {
    process.stdout.write(
      result.applied
        ? `Applied database migration ${result.id}.\n`
        : `Database migration ${result.id} is already current.\n`,
    );
  })
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : 'Unknown database migration error.';
    process.stderr.write(`Database migration failed: ${message}\n`);
    process.exit(1);
  });
