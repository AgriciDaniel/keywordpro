import { readFileSync } from 'node:fs';

export type DatabaseSslOption = 'require' | false;

export type PrimaryEncryptionKeySource =
  | 'KEYWORD_PRO_ENCRYPTION_KEY'
  | 'KEYWORD_PRO_ENCRYPTION_KEY_FILE'
  | 'RANKENSTEIN_ENCRYPTION_KEY';

export type EncryptionKeyringSource =
  | 'KEYWORD_PRO_ENCRYPTION_KEYS'
  | 'RANKENSTEIN_ENCRYPTION_KEYS';

export type EncryptionConfigurationSource =
  | PrimaryEncryptionKeySource
  | EncryptionKeyringSource
  | 'BETTER_AUTH_SECRET';

type RuntimeEnvironment = Record<string, string | undefined>;

const LEGACY_KID = 'legacy';
const KID_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;

type ResolvedKeyring = {
  activeKid: string;
  keys: Map<string, Buffer>;
  source: EncryptionKeyringSource;
};

export function computeDatabaseSsl(
  env: RuntimeEnvironment,
): DatabaseSslOption {
  const mode = env.DATABASE_SSL_MODE?.trim().toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'require') return 'require';
  throw new Error(
    'DATABASE_SSL_MODE must be set to "disable" for local PostgreSQL or "require" for a TLS database.',
  );
}

export function decodeBase64EncryptionKey(
  value: string,
  contextLabel: string,
): Buffer {
  const trimmed = value.trim();
  const key = Buffer.from(trimmed, 'base64');
  const normalized = trimmed.replace(/=+$/, '');
  const canonical = key.toString('base64').replace(/=+$/, '');
  if (key.length !== 32 || normalized !== canonical) {
    throw new Error(
      `${contextLabel} must be canonical base64 for 32 bytes (AES-256-GCM).`,
    );
  }
  return key;
}

export function resolvePrimaryEncryptionKey(
  env: RuntimeEnvironment,
): { source: PrimaryEncryptionKeySource; value: string } | null {
  const direct = env.KEYWORD_PRO_ENCRYPTION_KEY?.trim();
  const keyFile = env.KEYWORD_PRO_ENCRYPTION_KEY_FILE?.trim();
  let fileValue: string | undefined;
  if (keyFile) {
    try {
      fileValue = readFileSync(keyFile, 'utf8').trim();
      if (!fileValue) {
        throw new Error('The configured encryption key file is empty.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('is empty')) {
        throw error;
      }
      throw new Error('Unable to read KEYWORD_PRO_ENCRYPTION_KEY_FILE.');
    }
  }

  const legacy = env.RANKENSTEIN_ENCRYPTION_KEY?.trim();
  if (direct && fileValue && direct !== fileValue) {
    throw new Error(
      'KEYWORD_PRO_ENCRYPTION_KEY and KEYWORD_PRO_ENCRYPTION_KEY_FILE contain different keys.',
    );
  }

  const canonical = direct ?? fileValue;
  if (canonical && legacy && canonical !== legacy) {
    throw new Error(
      'KEYWORD_PRO_ENCRYPTION_KEY and legacy RANKENSTEIN_ENCRYPTION_KEY contain different keys.',
    );
  }

  if (direct) {
    return { source: 'KEYWORD_PRO_ENCRYPTION_KEY', value: direct };
  }
  if (fileValue) {
    return { source: 'KEYWORD_PRO_ENCRYPTION_KEY_FILE', value: fileValue };
  }
  if (legacy) {
    return { source: 'RANKENSTEIN_ENCRYPTION_KEY', value: legacy };
  }
  return null;
}

function parseBooleanEnvironmentValue(
  value: string | undefined,
  name: string,
): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  throw new Error(`${name} must be true, false, 1, or 0.`);
}

export function resolveAuthSecretFallbackAllowed(
  env: RuntimeEnvironment,
): boolean {
  const canonical = parseBooleanEnvironmentValue(
    env.KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK,
    'KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK',
  );
  const legacy = parseBooleanEnvironmentValue(
    env.RANKENSTEIN_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK,
    'RANKENSTEIN_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK',
  );
  if (canonical !== undefined && legacy !== undefined && canonical !== legacy) {
    throw new Error(
      'KEYWORD_PRO_ALLOW_AUTH_SECRET_ENCRYPTION_FALLBACK conflicts with its legacy RANKENSTEIN alias.',
    );
  }
  return canonical ?? legacy ?? false;
}

function parseEncryptionKeyring(
  raw: string,
  source: EncryptionKeyringSource,
): Map<string, Buffer> {
  const keys = new Map<string, Buffer>();
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) {
      throw new Error(`${source} entry is missing ":" between kid and key.`);
    }
    const kid = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (!KID_PATTERN.test(kid)) {
      throw new Error(
        `Invalid kid "${kid}" in ${source}. Kids must match [A-Za-z0-9_-]{1,32}.`,
      );
    }
    if (kid === LEGACY_KID) {
      throw new Error(
        `Kid "${LEGACY_KID}" is reserved for the single-key compatibility key.`,
      );
    }
    if (keys.has(kid)) {
      throw new Error(`Duplicate kid "${kid}" in ${source}.`);
    }
    keys.set(kid, decodeBase64EncryptionKey(value, `${source}[${kid}]`));
  }
  if (keys.size === 0) {
    throw new Error(`${source} must contain at least one key.`);
  }
  return keys;
}

function keyringsEqual(
  left: Map<string, Buffer>,
  right: Map<string, Buffer>,
): boolean {
  if (left.size !== right.size) return false;
  for (const [kid, key] of left) {
    if (!right.get(kid)?.equals(key)) return false;
  }
  return true;
}

export function resolveEncryptionKeyring(
  env: RuntimeEnvironment,
): ResolvedKeyring | null {
  const canonicalRaw = env.KEYWORD_PRO_ENCRYPTION_KEYS?.trim();
  const legacyRaw = env.RANKENSTEIN_ENCRYPTION_KEYS?.trim();
  const canonicalKeys = canonicalRaw
    ? parseEncryptionKeyring(canonicalRaw, 'KEYWORD_PRO_ENCRYPTION_KEYS')
    : null;
  const legacyKeys = legacyRaw
    ? parseEncryptionKeyring(legacyRaw, 'RANKENSTEIN_ENCRYPTION_KEYS')
    : null;

  if (canonicalKeys && legacyKeys && !keyringsEqual(canonicalKeys, legacyKeys)) {
    throw new Error(
      'KEYWORD_PRO_ENCRYPTION_KEYS conflicts with legacy RANKENSTEIN_ENCRYPTION_KEYS.',
    );
  }

  const canonicalActive = env.KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE?.trim();
  const legacyActive = env.RANKENSTEIN_ENCRYPTION_KEY_ACTIVE?.trim();
  if (
    canonicalActive &&
    legacyActive &&
    canonicalActive !== legacyActive
  ) {
    throw new Error(
      'KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE conflicts with legacy RANKENSTEIN_ENCRYPTION_KEY_ACTIVE.',
    );
  }

  const keys = canonicalKeys ?? legacyKeys;
  const activeKid = canonicalActive ?? legacyActive;
  if (!keys) {
    if (activeKid) {
      throw new Error(
        'An encryption keyring active kid was configured without an encryption keyring.',
      );
    }
    return null;
  }
  if (!activeKid) {
    throw new Error(
      'KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE is required when an encryption keyring is configured.',
    );
  }
  if (!keys.has(activeKid)) {
    throw new Error(
      `KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE="${activeKid}" is not present in the configured keyring.`,
    );
  }

  return {
    activeKid,
    keys,
    source: canonicalKeys
      ? 'KEYWORD_PRO_ENCRYPTION_KEYS'
      : 'RANKENSTEIN_ENCRYPTION_KEYS',
  };
}

/** Validate values synchronously before Next.js starts accepting requests. */
export function validateRuntimeEnvironment(
  env: RuntimeEnvironment,
): {
  databaseSsl: DatabaseSslOption;
  encryptionKeySource: EncryptionConfigurationSource;
} {
  if (!env.DATABASE_URL?.trim()) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  const databaseSsl = computeDatabaseSsl(env);
  const primaryKey = resolvePrimaryEncryptionKey(env);
  const keyring = resolveEncryptionKeyring(env);
  const allowFallback = resolveAuthSecretFallbackAllowed(env);

  if (primaryKey) {
    decodeBase64EncryptionKey(primaryKey.value, primaryKey.source);
  }

  if (!primaryKey && !keyring && !allowFallback) {
    throw new Error(
      'Missing KEYWORD_PRO_ENCRYPTION_KEY, KEYWORD_PRO_ENCRYPTION_KEY_FILE, or KEYWORD_PRO_ENCRYPTION_KEYS.',
    );
  }

  if (!primaryKey && !keyring && allowFallback) {
    const isProduction =
      env.NODE_ENV === 'production' &&
      env.NEXT_PHASE !== 'phase-production-build';
    if (isProduction) {
      throw new Error(
        'BETTER_AUTH_SECRET encryption fallback is not allowed in production.',
      );
    }
    if (!env.BETTER_AUTH_SECRET?.trim()) {
      throw new Error(
        'BETTER_AUTH_SECRET is required when the encryption fallback is enabled.',
      );
    }
  }

  return {
    databaseSsl,
    encryptionKeySource:
      keyring?.source ?? primaryKey?.source ?? 'BETTER_AUTH_SECRET',
  };
}
