import assert from 'node:assert/strict';
import {
  decryptSecret,
  encryptSecret,
  validateEncryptionConfig,
} from '../src/keyword-pro/crypto';

const TEST_KEYS = [
  'BETTER_AUTH_SECRET',
  'KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK',
  'KEYWORD_PRO_ENCRYPTION_KEY',
  'KEYWORD_PRO_ENCRYPTION_KEYS',
  'KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE',
  'KEYWORD_PRO_ENCRYPTION_KEY_FILE',
  'RANKENSTEIN_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK',
  'RANKENSTEIN_ENCRYPTION_KEY',
  'RANKENSTEIN_ENCRYPTION_KEYS',
  'RANKENSTEIN_ENCRYPTION_KEY_ACTIVE',
] as const;

type TestKey = (typeof TEST_KEYS)[number];
type EnvPatch = Partial<Record<TestKey, string | null>>;

function withEnvironment<T>(patch: EnvPatch, run: () => T): T {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(
    TEST_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<TestKey, string | undefined>;

  try {
    for (const key of TEST_KEYS) delete mutableEnvironment[key];
    for (const [key, value] of Object.entries(patch)) {
      if (value !== null && value !== undefined) mutableEnvironment[key] = value;
    }
    return run();
  } finally {
    for (const key of TEST_KEYS) {
      const value = previous[key];
      if (value === undefined) delete mutableEnvironment[key];
      else mutableEnvironment[key] = value;
    }
  }
}

function main(): void {
  const firstKey = Buffer.alloc(32, 3).toString('base64');
  const secondKey = Buffer.alloc(32, 4).toString('base64');
  const plaintext = 'synthetic-credential-value'; // pragma: allowlist secret
  let checks = 0;

  const v1 = withEnvironment(
    { KEYWORD_PRO_ENCRYPTION_KEY: firstKey },
    () => {
      const envelope = encryptSecret(plaintext);
      assert.match(envelope, /^v1:/);
      assert.equal(decryptSecret(envelope), plaintext);
      checks += 2;
      return envelope;
    },
  );

  withEnvironment(
    {
      KEYWORD_PRO_ENCRYPTION_KEY: firstKey,
      KEYWORD_PRO_ENCRYPTION_KEYS: `current:${secondKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    () => {
      assert.equal(decryptSecret(v1), plaintext);
      const envelope = encryptSecret(plaintext);
      assert.match(envelope, /^v2:current:/);
      assert.equal(decryptSecret(envelope), plaintext);
      checks += 3;
    },
  );

  const oldV2 = withEnvironment(
    {
      KEYWORD_PRO_ENCRYPTION_KEYS: `old:${firstKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'old',
    },
    () => encryptSecret(plaintext),
  );

  withEnvironment(
    {
      KEYWORD_PRO_ENCRYPTION_KEYS: `old:${firstKey},current:${secondKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    () => {
      assert.equal(decryptSecret(oldV2), plaintext);
      const current = encryptSecret(plaintext);
      assert.match(current, /^v2:current:/);
      assert.equal(decryptSecret(current), plaintext);
      checks += 3;
    },
  );

  withEnvironment(
    {
      RANKENSTEIN_ENCRYPTION_KEYS: `old:${firstKey},current:${secondKey}`,
      RANKENSTEIN_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    () => {
      const status = validateEncryptionConfig();
      assert.equal(status.source, 'RANKENSTEIN_ENCRYPTION_KEYS');
      assert.equal(status.activeKid, 'current');
      checks += 2;
    },
  );

  withEnvironment(
    {
      KEYWORD_PRO_ENCRYPTION_KEYS: `current:${secondKey}`,
      KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE: 'current',
    },
    () => {
      const originalConsoleError = console.error;
      try {
        console.error = () => undefined;
        assert.throws(() => decryptSecret(oldV2), /Unknown encryption kid "old"/);
      } finally {
        console.error = originalConsoleError;
      }
      checks += 1;
    },
  );

  process.stdout.write(`verify-encryption: ${checks} checks\n`);
}

main();
