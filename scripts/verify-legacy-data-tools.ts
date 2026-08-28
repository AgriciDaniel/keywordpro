import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import postgres, { type Sql } from 'postgres';
import {
  classifyLegacySession,
  exportLegacyData,
  formatLegacyInventory,
  inventoryLegacyData,
} from '../src/db/legacy-data';
import { migrateDatabase } from '../src/db/migrate';
import { RESEARCH_ENDPOINT_CATALOG } from '../src/lib/research/endpoint-catalog';
import { computeDatabaseSsl } from '../src/lib/runtime-environment';

loadEnvConfig(process.cwd());

const LEGACY_SCHEMA_PATH = fileURLToPath(
  new URL('./fixtures/legacy-keyword-pro-schema.sql', import.meta.url),
);
const allowedEndpointTypes = new Set(
  RESEARCH_ENDPOINT_CATALOG.map((endpoint) => endpoint.type),
);
const allowedEndpointType = RESEARCH_ENDPOINT_CATALOG[0]?.type;

let checks = 0;

function check(value: unknown, message: string): void {
  assert(value, message);
  checks += 1;
}

async function rejects(
  callback: () => Promise<unknown>,
  expected: RegExp,
): Promise<void> {
  await assert.rejects(callback, expected);
  checks += 1;
}

function requiredBaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error('DATABASE_URL is required for legacy data verification.');
  }
  return value;
}

function databaseUrl(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function validateDatabaseName(name: string): void {
  if (!/^keyword_pro_verify_legacytools_[a-z]+_[0-9]+$/.test(name)) {
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
  validateDatabaseName(name);
  await admin.unsafe(`CREATE DATABASE "${name}"`);
}

async function dropDatabase(admin: Sql, name: string): Promise<void> {
  validateDatabaseName(name);
  await admin`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = ${name} and pid <> pg_backend_pid()
  `;
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
}

function verifyClassifications(): void {
  if (!allowedEndpointType) throw new Error('The keyword endpoint catalog is empty.');
  check(allowedEndpointTypes.size === 332, 'the allowlist is the 332-endpoint catalog');
  check(
    classifyLegacySession(
      {
        endpoint_selection: {
          category: 'seo',
          providers: ['dataforseo'],
          sources: ['keywords', 'serp'],
        },
        input_type: 'keyword',
        results: [{ type: allowedEndpointType }],
      },
      allowedEndpointTypes,
    ) === 'keyword-compatible',
    'a valid keyword session is compatible',
  );
  check(
    classifyLegacySession(
      {
        endpoint_selection: null,
        input_type: 'domain',
        results: [{ type: allowedEndpointType }],
      },
      allowedEndpointTypes,
    ) === 'legacy-nonkeyword',
    'a domain session is legacy non-keyword',
  );
  check(
    classifyLegacySession(
      {
        endpoint_selection: { providers: ['legacy-provider'] },
        input_type: 'keyword',
        results: [{ type: allowedEndpointType }],
      },
      allowedEndpointTypes,
    ) === 'legacy-nonkeyword',
    'a retired provider marks the session as legacy',
  );
  check(
    classifyLegacySession(
      {
        endpoint_selection: null,
        input_type: 'keyword',
        results: [{ type: 'legacy.website.endpoint' }],
      },
      allowedEndpointTypes,
    ) === 'legacy-nonkeyword',
    'an endpoint outside the allowlist marks the session as legacy',
  );
  check(
    classifyLegacySession(
      {
        endpoint_selection: null,
        input_type: 'keyword',
        results: null,
      },
      allowedEndpointTypes,
    ) === 'needs-review',
    'a result-free keyword session needs review',
  );
  check(
    classifyLegacySession(
      {
        endpoint_selection: [],
        input_type: 'keyword',
        results: [{ type: allowedEndpointType }],
      },
      allowedEndpointTypes,
    ) === 'needs-review',
    'a malformed endpoint selection needs review',
  );
}

async function seedLegacyDatabase(sql: Sql): Promise<void> {
  const legacySchema = await readFile(LEGACY_SCHEMA_PATH, 'utf8');
  await sql.unsafe(legacySchema);
  await sql`
    insert into public."user" (id, name, email)
    values ('inventory-user', 'Inventory Fixture', 'inventory-user.invalid')
  `;
  await sql`
    insert into public.rankenstein_api_credentials
      (user_id, gemini_api_key, scrapecreators_api_key,
       dataforseo_login, dataforseo_password)
    values (
      'inventory-user',
      'v1:fixture-iv:fixture-tag:fixture-gemini-ciphertext',
      'v1:fixture-iv:fixture-tag:fixture-social-ciphertext',
      'v1:fixture-iv:fixture-tag:fixture-login-ciphertext',
      'v2:current:fixture-iv:fixture-tag:fixture-password-ciphertext'
    )
  `;
  await sql`
    insert into public.rankenstein_research_sessions
      (id, user_id, title, input, input_type, primary_tab, filters,
       endpoint_selection, results)
    values (
      'legacy-session',
      'inventory-user',
      'Legacy fixture',
      'example.test',
      'domain',
      'keywords',
      '{}'::jsonb,
      ${sql.json({ providers: ['legacy-provider'], sources: ['web'] })},
      ${sql.json([
        {
          error: null,
          label: 'Legacy fixture result',
          response: { fixture: true },
          type: 'legacy.website.endpoint',
        },
      ])}
    )
  `;
  await sql`
    insert into public.rankenstein_research_opportunities
      (id, research_session_id, rank, title, intent, source_tab)
    values (
      'legacy-opportunity', 'legacy-session', 1, 'Legacy opportunity',
      'informational', 'keywords'
    )
  `;
}

async function addCanonicalFixtures(sql: Sql): Promise<void> {
  if (!allowedEndpointType) throw new Error('The keyword endpoint catalog is empty.');
  await sql`
    insert into public.keyword_pro_research_sessions
      (id, user_id, title, input, input_type, primary_tab, filters,
       endpoint_selection, results)
    values
      (
        'keyword-session',
        'inventory-user',
        'Keyword fixture',
        'keyword fixture',
        'keyword',
        'keywords',
        '{}'::jsonb,
        ${sql.json({
          category: 'seo',
          providers: ['dataforseo'],
          sources: ['keywords', 'serp'],
        })},
        ${sql.json([
          {
            error: null,
            label: 'Keyword fixture result',
            response: { fixture: true },
            type: allowedEndpointType,
          },
        ])}
      ),
      (
        'review-session',
        'inventory-user',
        'Review fixture',
        'review fixture',
        'keyword',
        'keywords',
        '{}'::jsonb,
        null,
        null
      )
  `;
}

async function verifyFreshDatabase(url: string): Promise<void> {
  await migrateDatabase({ databaseUrl: url, env: process.env });
  const sql = openSql(url);
  try {
    const inventory = await inventoryLegacyData(sql, allowedEndpointTypes);
    check(inventory.sessions.total === 0, 'fresh database has no saved sessions');
    check(
      !inventory.credentials.legacyColumnsPresent.geminiApiKey,
      'fresh database has no Gemini legacy column',
    );
    check(
      !inventory.credentials.legacyColumnsPresent.scrapeCreatorsApiKey,
      'fresh database has no ScrapeCreators legacy column',
    );
    check(
      inventory.credentials.legacyConfiguredRows === 0,
      'fresh database has no configured legacy credentials',
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function verifyLegacyDatabase(url: string): Promise<void> {
  const sql = openSql(url);
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), 'keyword-pro-legacy-export-'),
  );
  try {
    await seedLegacyDatabase(sql);
    await migrateDatabase({ databaseUrl: url, env: process.env });
    await addCanonicalFixtures(sql);

    const inventory = await inventoryLegacyData(sql, allowedEndpointTypes);
    check(inventory.sessions.total === 3, 'inventory counts every saved session');
    check(
      inventory.sessions.keywordCompatible === 1,
      'inventory counts compatible keyword sessions',
    );
    check(
      inventory.sessions.legacyNonKeyword === 1,
      'inventory counts legacy non-keyword sessions',
    );
    check(
      inventory.sessions.needsReview === 1,
      'inventory counts ambiguous sessions separately',
    );
    check(inventory.opportunities.total === 1, 'inventory counts opportunities');
    check(
      inventory.credentials.dataForSeoConfiguredRows === 1,
      'inventory counts current provider credential rows',
    );
    check(
      inventory.credentials.legacyConfiguredRows === 1,
      'inventory counts legacy credential rows without reading them aloud',
    );
    check(
      inventory.credentials.geminiConfiguredRows === 1 &&
        inventory.credentials.scrapeCreatorsConfiguredRows === 1,
      'inventory reports each retained legacy credential column',
    );

    const formatted = formatLegacyInventory(inventory);
    check(!formatted.includes('inventory-user'), 'inventory output omits record IDs');
    check(!formatted.includes('ciphertext'), 'inventory output omits encrypted values');

    const outputPath = join(temporaryDirectory, 'compatibility-export.json');
    const result = await exportLegacyData({
      allowedEndpointTypes,
      now: new Date('2026-08-28T00:00:00.000Z'),
      outputPath,
      repositoryRoot: process.cwd(),
      sql,
    });
    const bytes = await readFile(outputPath);
    const payload = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    check(
      ((await stat(outputPath)).mode & 0o777) === 0o600,
      'export file permissions are exactly 0600',
    );
    check(
      result.sha256 === createHash('sha256').update(bytes).digest('hex'),
      'export reports the exact file checksum',
    );
    check(result.filename === 'compatibility-export.json', 'export logs only a basename');
    check(payload.version === 1, 'export format is versioned');
    check(
      Array.isArray(payload.savedSessions) && payload.savedSessions.length === 3,
      'export preserves every saved session',
    );
    check(
      Array.isArray(payload.savedOpportunities) &&
        payload.savedOpportunities.length === 1,
      'export preserves dependent opportunities',
    );
    check(
      Array.isArray(payload.legacyCredentials) &&
        payload.legacyCredentials.length === 1,
      'export preserves only retained legacy credential columns',
    );
    const exportedCredential = (
      payload.legacyCredentials as Array<Record<string, unknown>>
    )[0];
    check(
      exportedCredential?.gemini_api_key ===
        'v1:fixture-iv:fixture-tag:fixture-gemini-ciphertext',
      'export preserves encrypted bytes without decrypting them',
    );
    check(
      !('dataforseo_login' in (exportedCredential ?? {})) &&
        !('dataforseo_password' in (exportedCredential ?? {})),
      'export excludes current DataForSEO credentials',
    );

    await rejects(
      () =>
        exportLegacyData({
          allowedEndpointTypes,
          outputPath,
          repositoryRoot: process.cwd(),
          sql,
        }),
      /Refusing to overwrite an existing export file/,
    );
    await rejects(
      () =>
        exportLegacyData({
          allowedEndpointTypes,
          outputPath: join(process.cwd(), 'private-export-should-not-exist.json'),
          repositoryRoot: process.cwd(),
          sql,
        }),
      /inside the repository/,
    );
  } finally {
    await sql.end({ timeout: 5 });
    await rm(temporaryDirectory, { recursive: true });
  }
}

async function main(): Promise<void> {
  verifyClassifications();
  const baseUrl = requiredBaseUrl();
  const admin = openSql(databaseUrl(baseUrl, 'postgres'));
  const databases = {
    fresh: `keyword_pro_verify_legacytools_fresh_${process.pid}`,
    legacy: `keyword_pro_verify_legacytools_legacy_${process.pid}`,
  };

  try {
    for (const database of Object.values(databases)) {
      await dropDatabase(admin, database);
      await createDatabase(admin, database);
    }
    await verifyFreshDatabase(databaseUrl(baseUrl, databases.fresh));
    await verifyLegacyDatabase(databaseUrl(baseUrl, databases.legacy));
  } finally {
    for (const database of Object.values(databases)) {
      await dropDatabase(admin, database);
    }
    await admin.end({ timeout: 5 });
  }

  process.stdout.write(`verify-legacy-data-tools: ${checks} checks\n`);
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown legacy data verification error.';
  process.stderr.write(`verify-legacy-data-tools failed: ${message}\n`);
  process.exit(1);
});
