import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postgres, { type Sql } from 'postgres';
import { computeDatabaseSsl } from '@/lib/runtime-environment';

const MIGRATION_ID = '0001_keyword_pro_compatibility_bridge';
const MIGRATION_FILE = fileURLToPath(
  new URL(
    './migrations/0001_keyword_pro_compatibility_bridge.sql',
    import.meta.url,
  ),
);

export type DatabaseMigrationResult = {
  applied: boolean;
  checksum: string;
  id: string;
};

type MigrationOptions = {
  databaseUrl?: string;
  env?: Record<string, string | undefined>;
  sql?: Sql;
};

function requiredDatabaseUrl(options: MigrationOptions): string {
  const value = options.databaseUrl ?? options.env?.DATABASE_URL;
  if (!value?.trim()) {
    throw new Error('DATABASE_URL is required to migrate Keyword Pro.');
  }
  return value;
}

export async function migrateDatabase(
  options: MigrationOptions = { env: process.env },
): Promise<DatabaseMigrationResult> {
  const migrationSql = readFileSync(MIGRATION_FILE, 'utf8');
  const checksum = createHash('sha256').update(migrationSql).digest('hex');
  const ownClient = !options.sql;
  const env = options.env ?? process.env;
  const sql =
    options.sql ??
    postgres(requiredDatabaseUrl(options), {
      max: 1,
      onnotice: () => undefined,
      prepare: false,
      ssl: computeDatabaseSsl(env),
    });

  try {
    return await sql.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(hashtext('keyword-pro:migrations'))`;
      await transaction.unsafe(`
        CREATE TABLE IF NOT EXISTS public.keyword_pro_schema_migrations (
          id text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamp NOT NULL DEFAULT now()
        )
      `);

      const existing = await transaction<
        Array<{ checksum: string }>
      >`select checksum from public.keyword_pro_schema_migrations where id = ${MIGRATION_ID}`;
      if (existing[0] && existing[0].checksum !== checksum) {
        throw new Error(
          `Migration ${MIGRATION_ID} was modified after it was applied.`,
        );
      }

      await transaction.unsafe(migrationSql);

      if (!existing[0]) {
        await transaction`
          insert into public.keyword_pro_schema_migrations (id, checksum)
          values (${MIGRATION_ID}, ${checksum})
        `;
      }

      return {
        applied: !existing[0],
        checksum,
        id: MIGRATION_ID,
      };
    });
  } finally {
    if (ownClient) {
      await sql.end({ timeout: 5 });
    }
  }
}
