import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { register } from '../src/instrumentation';
import { dispatchResearch } from '../src/lib/research/dispatcher';

const TEST_KEYS = [
  'BETTER_AUTH_SECRET',
  'DATABASE_SSL_MODE',
  'DATABASE_URL',
  'KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK',
  'KEYWORD_PRO_ENCRYPTION_KEY',
  'KEYWORD_PRO_ENCRYPTION_KEYS',
  'KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE',
  'KEYWORD_PRO_ENCRYPTION_KEY_FILE',
  'NEXT_PHASE',
  'NEXT_RUNTIME',
  'NODE_ENV',
  'RANKENSTEIN_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK',
  'RANKENSTEIN_ENCRYPTION_KEY',
  'RANKENSTEIN_ENCRYPTION_KEYS',
  'RANKENSTEIN_ENCRYPTION_KEY_ACTIVE',
] as const;

type TestKey = (typeof TEST_KEYS)[number];
type EnvPatch = Partial<Record<TestKey, string | null>>;

async function withEnvironment(
  patch: EnvPatch,
  run: () => Promise<void>,
): Promise<void> {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(
    TEST_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<TestKey, string | undefined>;

  try {
    for (const key of TEST_KEYS) delete mutableEnvironment[key];
    for (const [key, value] of Object.entries(patch)) {
      if (value !== null && value !== undefined) mutableEnvironment[key] = value;
    }
    await run();
  } finally {
    for (const key of TEST_KEYS) {
      const value = previous[key];
      if (value === undefined) delete mutableEnvironment[key];
      else mutableEnvironment[key] = value;
    }
  }
}

async function main(): Promise<void> {
  const validKey = Buffer.alloc(32, 1).toString('base64');
  const rotatedKey = Buffer.alloc(32, 2).toString('base64');
  const validEnvironment: EnvPatch = {
    DATABASE_SSL_MODE: 'disable',
    DATABASE_URL: 'postgresql://localhost/keyword_pro',
    KEYWORD_PRO_ENCRYPTION_KEY: validKey,
    NEXT_RUNTIME: 'nodejs',
    NODE_ENV: 'test',
  };

  let checks = 0;

  await withEnvironment(validEnvironment, async () => {
    await register();
    checks += 1;
  });

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEY: null,
      KEYWORD_PRO_ENCRYPTION_KEYS: `current:${rotatedKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    async () => {
      await register();
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEY: null,
      RANKENSTEIN_ENCRYPTION_KEYS: `current:${rotatedKey}`,
      RANKENSTEIN_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    async () => {
      await register();
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEY: null,
      KEYWORD_PRO_ENCRYPTION_KEYS: `current:${rotatedKey},old:${validKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'current',
      RANKENSTEIN_ENCRYPTION_KEYS: ` old:${validKey} , current:${rotatedKey} `,
      RANKENSTEIN_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    async () => {
      await register();
      checks += 1;
    },
  );

  await withEnvironment(
    { ...validEnvironment, DATABASE_SSL_MODE: 'bogus' },
    async () => {
      await assert.rejects(register(), /DATABASE_SSL_MODE/);
      checks += 1;
    },
  );

  await withEnvironment(
    { ...validEnvironment, KEYWORD_PRO_ENCRYPTION_KEY: 'invalid' },
    async () => {
      await assert.rejects(register(), /32 bytes/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEY: `${validKey.slice(0, -1)}!`,
    },
    async () => {
      await assert.rejects(register(), /canonical base64/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      RANKENSTEIN_ENCRYPTION_KEY: rotatedKey,
    },
    async () => {
      await assert.rejects(register(), /contain different keys/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEYS: `current:${validKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'current',
      RANKENSTEIN_ENCRYPTION_KEYS: `current:${rotatedKey}`,
      RANKENSTEIN_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    async () => {
      await assert.rejects(register(), /ENCRYPTION_KEYS conflicts/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEYS: `current:${validKey},next:${rotatedKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'current',
      RANKENSTEIN_ENCRYPTION_KEYS: `current:${validKey},next:${rotatedKey}`,
      RANKENSTEIN_ENCRYPTION_KEY_ACTIVE: 'next',
    },
    async () => {
      await assert.rejects(register(), /ENCRYPTION_KEY_ACTIVE conflicts/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK: 'false', // pragma: allowlist secret
      RANKENSTEIN_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK: 'true', // pragma: allowlist secret
    },
    async () => {
      await assert.rejects(register(), /ALLOW_AUTH_SECRET.*conflicts/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      BETTER_AUTH_SECRET: 'synthetic-test-only-value', // pragma: allowlist secret
      KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK: 'true', // pragma: allowlist secret
      KEYWORD_PRO_ENCRYPTION_KEY: null,
    },
    async () => {
      await register();
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      BETTER_AUTH_SECRET: 'synthetic-test-only-value', // pragma: allowlist secret
      KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK: 'true', // pragma: allowlist secret
      KEYWORD_PRO_ENCRYPTION_KEY: null,
      NODE_ENV: 'production',
    },
    async () => {
      await assert.rejects(register(), /fallback is not allowed in production/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEY: null,
    },
    async () => {
      await assert.rejects(register(), /Missing KEYWORD_PRO_ENCRYPTION_KEY/);
      checks += 1;
    },
  );

  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEY: null,
      KEYWORD_PRO_ENCRYPTION_KEYS: `current:${validKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'missing',
    },
    async () => {
      await assert.rejects(register(), /is not present in the configured keyring/);
      checks += 1;
    },
  );

  const missingKeyFile = resolve(
    process.cwd(),
    '.keyword-pro-missing-encryption-key',
  );
  assert.equal(existsSync(missingKeyFile), false);
  await withEnvironment(
    {
      ...validEnvironment,
      KEYWORD_PRO_ENCRYPTION_KEY: null,
      KEYWORD_PRO_ENCRYPTION_KEY_FILE: missingKeyFile,
    },
    async () => {
      await assert.rejects(register(), /Unable to read/);
      checks += 1;
    },
  );

  await assert.rejects(
    dispatchResearch({
      endpointId: 'keyword.bing.search_volume.live',
      params: {
        country: 'US',
        language: 'es',
        keywords: ['example'],
      },
    }),
    /Bing Keywords Data does not support/,
  );
  checks += 1;

  await assert.rejects(
    dispatchResearch({
      endpointId: 'labs.amazon.related_keywords.live',
      params: {
        country: 'US',
        keyword: 'example',
        language: 'es',
      },
    }),
    /Amazon is not available/,
  );
  checks += 1;

  await assert.rejects(
    dispatchResearch({
      endpointId: 'serp.bing.organic.live',
      params: {
        country: 'AL',
        keyword: 'example',
        language: 'sq',
      },
    }),
    /Bing SERP does not support/,
  );
  checks += 1;

  process.stdout.write(`verify-runtime-env: ${checks} checks\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
