import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import postgres, { type Sql } from 'postgres';
import { migrateDatabase } from '../src/db/migrate';
import { computeDatabaseSsl } from '../src/lib/runtime-environment';

loadEnvConfig(process.cwd());

const LEGACY_SCHEMA = readFileSync(
  fileURLToPath(new URL('./fixtures/legacy-keyword-pro-schema.sql', import.meta.url)),
  'utf8',
);

const LEGACY_TABLES = [
  'rankenstein_user_settings',
  'rankenstein_api_credentials',
  'rankenstein_research_sessions',
  'rankenstein_research_opportunities',
] as const;

const CANONICAL_TABLES = [
  'keyword_pro_user_settings',
  'keyword_pro_api_credentials',
  'keyword_pro_research_sessions',
  'keyword_pro_research_opportunities',
] as const;

const EXPECTED_CONSTRAINTS = [
  'keyword_pro_user_settings_pkey',
  'keyword_pro_user_settings_user_id_user_id_fk',
  'keyword_pro_api_credentials_pkey',
  'keyword_pro_api_credentials_user_id_user_id_fk',
  'keyword_pro_research_sessions_pkey',
  'keyword_pro_research_sessions_user_id_user_id_fk',
  'keyword_pro_research_sessions_input_type_check',
  'keyword_pro_research_sessions_status_check',
  'keyword_pro_research_sessions_source_check',
  'keyword_pro_research_opportunities_pkey',
  'keyword_pro_research_opportunities_research_session_id_fk',
] as const;

const EXPECTED_INDEXES = [
  'keyword_pro_research_sessions_user_created_idx',
  'keyword_pro_research_sessions_pinned_idx',
  'keyword_pro_research_sessions_pinned_order_idx',
  'keyword_pro_research_opportunities_session_idx',
] as const;

type StableSnapshot = {
  credentials: unknown[];
  opportunities: unknown[];
  sessions: unknown[];
  settings: unknown[];
};

function requiredBaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error('DATABASE_URL is required for database migration verification.');
  }
  return value;
}

function databaseUrl(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function validateTestDatabaseName(name: string): void {
  if (!/^keyword_pro_verify_[a-z]+_[0-9]+$/.test(name)) {
    throw new Error(`Refusing unexpected verification database name: ${name}`);
  }
}

function openSql(url: string): Sql {
  return postgres(url, {
    max: 1,
    onnotice: () => undefined,
    prepare: false,
    ssl: computeDatabaseSsl(process.env),
  });
}

async function createDatabase(admin: Sql, name: string): Promise<void> {
  validateTestDatabaseName(name);
  await admin.unsafe(`CREATE DATABASE "${name}"`);
}

async function dropDatabase(admin: Sql, name: string): Promise<void> {
  validateTestDatabaseName(name);
  await admin`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = ${name} and pid <> pg_backend_pid()
  `;
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
}

async function publicTableNames(sql: Sql): Promise<string[]> {
  const rows = await sql<Array<{ table_name: string }>>`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  return rows.map((row) => row.table_name);
}

async function tableOids(sql: Sql): Promise<Record<string, string>> {
  const rows = await sql<Array<{ oid: string; relname: string }>>`
    select class_row.relname, class_row.oid::text as oid
    from pg_class as class_row
    join pg_namespace as namespace_row
      on namespace_row.oid = class_row.relnamespace
    where namespace_row.nspname = 'public' and class_row.relkind = 'r'
    order by class_row.relname
  `;
  return Object.fromEntries(rows.map((row) => [row.relname, row.oid]));
}

async function stableSnapshot(sql: Sql): Promise<StableSnapshot> {
  const credentials = await sql`
    select user_id, gemini_api_key, scrapecreators_api_key,
      dataforseo_login, dataforseo_password
    from public.keyword_pro_api_credentials
    order by user_id
  `;
  const sessions = await sql`
    select id, user_id, title, input, input_type, primary_tab, filters,
      endpoint_selection, status, source, summary, results, is_pinned,
      pinned_order
    from public.keyword_pro_research_sessions
    order by id
  `;
  const opportunities = await sql`
    select id, research_session_id, rank, title, intent, search_volume,
      keyword_difficulty, cpc::text, source_tab, meta
    from public.keyword_pro_research_opportunities
    order by id
  `;
  const settings = await sql`
    select user_id, display_name, bio, avatar_url, preset_avatar, time_zone
    from public.keyword_pro_user_settings
    order by user_id
  `;
  return { credentials, opportunities, sessions, settings };
}

async function assertCanonicalStructure(sql: Sql): Promise<void> {
  const tables = await publicTableNames(sql);
  for (const name of CANONICAL_TABLES) assert(tables.includes(name));
  for (const name of LEGACY_TABLES) assert(!tables.includes(name));

  const constraints = await sql<Array<{ conname: string }>>`
    select constraint_row.conname
    from pg_constraint as constraint_row
    join pg_class as table_row on table_row.oid = constraint_row.conrelid
    where table_row.relname = any(${[...CANONICAL_TABLES]}::text[])
    order by constraint_row.conname
  `;
  const constraintNames = new Set(constraints.map((row) => row.conname));
  for (const name of EXPECTED_CONSTRAINTS) assert(constraintNames.has(name));

  const indexes = await sql<Array<{ indexname: string }>>`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = any(${[...CANONICAL_TABLES]}::text[])
    order by indexname
  `;
  const indexNames = new Set(indexes.map((row) => row.indexname));
  for (const name of EXPECTED_INDEXES) assert(indexNames.has(name));
}

async function credentialColumns(sql: Sql): Promise<string[]> {
  const rows = await sql<Array<{ column_name: string }>>`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'keyword_pro_api_credentials'
    order by ordinal_position
  `;
  return rows.map((row) => row.column_name);
}

async function seedLegacyData(sql: Sql): Promise<void> {
  await sql`
    insert into public."user" (id, name, email)
    values ('synthetic-user', 'Synthetic User', 'synthetic-user.invalid')
  `;
  await sql`
    insert into public.rankenstein_user_settings
      (user_id, display_name, bio, time_zone)
    values ('synthetic-user', 'Synthetic', 'migration fixture', 'UTC')
  `;
  await sql`
    insert into public.rankenstein_api_credentials
      (user_id, gemini_api_key, scrapecreators_api_key,
       dataforseo_login, dataforseo_password)
    values (
      'synthetic-user',
      'v1:synthetic-iv:synthetic-tag:synthetic-gemini',
      'v1:synthetic-iv:synthetic-tag:synthetic-social',
      'v1:synthetic-iv:synthetic-tag:synthetic-login',
      'v2:current:synthetic-iv:synthetic-tag:synthetic-password'
    )
  `;
  await sql`
    insert into public.rankenstein_research_sessions
      (id, user_id, title, input, input_type, primary_tab, filters,
       endpoint_selection, results, is_pinned, pinned_order)
    values (
      'synthetic-session',
      'synthetic-user',
      'Synthetic legacy session',
      'example.test',
      'domain',
      'keywords',
      ${JSON.stringify({ language: 'English', location: 'United States' })}::jsonb,
      ${JSON.stringify({ providers: ['legacy-provider'], sources: ['web'] })}::jsonb,
      ${JSON.stringify([
        {
          error: null,
          label: 'Synthetic legacy result',
          response: { count: 1, results: [{ synthetic: true }] },
          type: 'legacy.website.endpoint',
        },
      ])}::jsonb,
      1,
      1
    )
  `;
  await sql`
    insert into public.rankenstein_research_opportunities
      (id, research_session_id, rank, title, intent, search_volume,
       keyword_difficulty, cpc, source_tab, meta)
    values (
      'synthetic-opportunity',
      'synthetic-session',
      1,
      'Synthetic opportunity',
      'informational',
      10,
      20,
      1.25,
      'keywords',
      ${JSON.stringify({ synthetic: true })}::jsonb
    )
  `;
}

async function verifyFreshDatabase(url: string): Promise<number> {
  const sql = openSql(url);
  try {
    const first = await migrateDatabase({ databaseUrl: url, env: process.env });
    assert.equal(first.applied, true);
    await assertCanonicalStructure(sql);
    const firstOids = await tableOids(sql);
    const columns = await credentialColumns(sql);
    assert(!columns.includes('gemini_api_key'));
    assert(!columns.includes('scrapecreators_api_key'));

    const second = await migrateDatabase({ databaseUrl: url, env: process.env });
    assert.equal(second.applied, false);
    assert.deepEqual(await tableOids(sql), firstOids);
    const ledger = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from public.keyword_pro_schema_migrations
    `;
    assert.equal(ledger[0]?.count, 1);
    return 7;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function verifyLegacyDatabase(url: string): Promise<number> {
  const sql = openSql(url);
  try {
    await sql.unsafe(LEGACY_SCHEMA);
    await seedLegacyData(sql);
    const beforeOids = await tableOids(sql);

    const result = await migrateDatabase({ databaseUrl: url, env: process.env });
    assert.equal(result.applied, true);
    await assertCanonicalStructure(sql);

    const afterOids = await tableOids(sql);
    for (let index = 0; index < LEGACY_TABLES.length; index += 1) {
      assert.equal(
        afterOids[CANONICAL_TABLES[index]],
        beforeOids[LEGACY_TABLES[index]],
      );
    }

    const snapshot = await stableSnapshot(sql);
    assert.equal(snapshot.credentials.length, 1);
    assert.equal(snapshot.sessions.length, 1);
    assert.equal(snapshot.opportunities.length, 1);
    assert.equal(snapshot.settings.length, 1);
    const columns = await credentialColumns(sql);
    assert(columns.includes('gemini_api_key'));
    assert(columns.includes('scrapecreators_api_key'));

    const second = await migrateDatabase({ databaseUrl: url, env: process.env });
    assert.equal(second.applied, false);
    assert.deepEqual(await tableOids(sql), afterOids);
    assert.deepEqual(await stableSnapshot(sql), snapshot);

    await sql`
      delete from public.keyword_pro_research_sessions
      where id = 'synthetic-session'
    `;
    const opportunityCount = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from public.keyword_pro_research_opportunities
    `;
    assert.equal(opportunityCount[0]?.count, 0);

    await sql`
      insert into public.keyword_pro_research_sessions
        (id, user_id, title, input, input_type, primary_tab, filters)
      values (
        'cascade-session', 'synthetic-user', 'Cascade', 'keyword',
        'keyword', 'keywords', '{}'::jsonb
      )
    `;
    await sql`
      delete from public."user" where id = 'synthetic-user'
    `;
    for (const tableName of CANONICAL_TABLES) {
      const count = await sql.unsafe<Array<{ count: number }>>(
        `select count(*)::int as count from public."${tableName}"`,
      );
      assert.equal(count[0]?.count, 0);
    }
    return 18;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function verifyMixedDatabase(url: string): Promise<number> {
  const sql = openSql(url);
  try {
    await sql.unsafe(`
      CREATE TABLE public.rankenstein_user_settings (id text primary key);
      CREATE TABLE public.keyword_pro_user_settings (id text primary key);
    `);
    await assert.rejects(
      migrateDatabase({ databaseUrl: url, env: process.env }),
      /Ambiguous Keyword Pro schema state/,
    );
    const ledger = await sql<Array<{ ledger: string | null }>>`
      select to_regclass('public.keyword_pro_schema_migrations')::text as ledger
    `;
    assert.equal(ledger[0]?.ledger, null);
    return 2;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main(): Promise<void> {
  const baseUrl = requiredBaseUrl();
  const adminUrl = databaseUrl(baseUrl, 'postgres');
  const admin = openSql(adminUrl);
  const suffix = String(process.pid);
  const databases = {
    fresh: `keyword_pro_verify_fresh_${suffix}`,
    legacy: `keyword_pro_verify_legacy_${suffix}`,
    mixed: `keyword_pro_verify_mixed_${suffix}`,
  };

  let checks = 0;
  try {
    for (const name of Object.values(databases)) {
      await dropDatabase(admin, name);
      await createDatabase(admin, name);
    }
    checks += await verifyFreshDatabase(databaseUrl(baseUrl, databases.fresh));
    checks += await verifyLegacyDatabase(databaseUrl(baseUrl, databases.legacy));
    checks += await verifyMixedDatabase(databaseUrl(baseUrl, databases.mixed));
  } finally {
    for (const name of Object.values(databases)) {
      await dropDatabase(admin, name);
    }
    await admin.end({ timeout: 5 });
  }

  process.stdout.write(`verify-database-migration: ${checks} checks\n`);
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown migration verification error.';
  process.stderr.write(`verify-database-migration failed: ${message}\n`);
  process.exit(1);
});
