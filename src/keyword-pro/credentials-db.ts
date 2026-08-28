import 'server-only';

import { getDb } from '@/db';
import { keywordProApiCredentials } from '@/db/schema';
import {
  decryptOptionalSecret,
  encryptOptionalSecret,
  encryptSecret,
  isEncryptedSecretEnvelope,
} from '@/keyword-pro/crypto';
import { eq } from 'drizzle-orm';

/**
 * Encrypted storage for the provider credentials entered on the Connections tab.
 *
 * Keyword Pro exposes only the DataForSEO login and password fields. Legacy
 * provider columns can remain in an upgraded database, but the application
 * never reads or rewrites them.
 *
 * Values are AES-256-GCM encrypted at rest by `@/keyword-pro/crypto` and are
 * never returned to the client in plaintext; the UI only ever sees a mask.
 */

export const API_CREDENTIAL_CONFIGURED_PLACEHOLDER = '[CONFIGURED]';
export const API_CREDENTIAL_MASKED_PLACEHOLDER = '********';

export type ApiCredentialField =
  | 'dataforseoLogin'
  | 'dataforseoPassword';

export const API_CREDENTIAL_FIELDS: ApiCredentialField[] = [
  'dataforseoLogin',
  'dataforseoPassword',
];

export type ApiCredentialsInput = Partial<
  Record<ApiCredentialField, string | null>
>;

export type ApiCredentials = Record<ApiCredentialField, string | null>;

function isPlaceholder(value: string) {
  return (
    value === API_CREDENTIAL_CONFIGURED_PLACEHOLDER ||
    value === API_CREDENTIAL_MASKED_PLACEHOLDER
  );
}

/** Prevent UI placeholders from ever being encrypted and stored as secrets. */
function normalizeStoredCredential(value?: string | null) {
  if (!value) return null;
  if (isPlaceholder(value)) return null;
  if (isEncryptedSecretEnvelope(value)) return value;
  return encryptSecret(value);
}

function resolveCredentialValue(
  value: string | null | undefined,
  fallback?: string | null,
) {
  const normalizedFallback = normalizeStoredCredential(fallback);
  // undefined means "field not submitted" - keep whatever is stored.
  if (value === undefined) return normalizedFallback;
  // null means "explicitly cleared".
  if (value === null) return null;
  // A masked value came back untouched from the form - keep what is stored.
  if (isPlaceholder(value)) return normalizedFallback;
  return encryptOptionalSecret(value);
}

export async function upsertApiCredentials(
  userId: string,
  input: ApiCredentialsInput,
) {
  const db = await getDb();
  const now = new Date();

  const existing = await db
    .select()
    .from(keywordProApiCredentials)
    .where(eq(keywordProApiCredentials.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const next = Object.fromEntries(
    API_CREDENTIAL_FIELDS.map((field) => [
      field,
      resolveCredentialValue(input[field], existing?.[field]),
    ]),
  ) as ApiCredentials;

  if (!existing) {
    await db.insert(keywordProApiCredentials).values({
      userId,
      ...next,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await db
    .update(keywordProApiCredentials)
    .set({ ...next, updatedAt: now })
    .where(eq(keywordProApiCredentials.userId, userId));
}

/** Decrypted values. Server-side only - never send this to the client. */
export async function getApiCredentials(
  userId: string,
): Promise<ApiCredentials | null> {
  const db = await getDb();
  const row = await db
    .select()
    .from(keywordProApiCredentials)
    .where(eq(keywordProApiCredentials.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return null;

  return Object.fromEntries(
    API_CREDENTIAL_FIELDS.map((field) => [
      field,
      decryptOptionalSecret(row[field]) ?? null,
    ]),
  ) as ApiCredentials;
}

/** Booleans only - safe to send to the client to drive "configured" badges. */
export async function getApiCredentialsStatus(
  userId: string,
): Promise<Record<ApiCredentialField, boolean>> {
  const db = await getDb();
  const row = await db
    .select()
    .from(keywordProApiCredentials)
    .where(eq(keywordProApiCredentials.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return Object.fromEntries(
    API_CREDENTIAL_FIELDS.map((field) => [field, Boolean(row?.[field])]),
  ) as Record<ApiCredentialField, boolean>;
}

export async function clearApiCredentialFields(
  userId: string,
  fields: ApiCredentialField[],
) {
  if (fields.length === 0) return;
  const db = await getDb();
  await db
    .update(keywordProApiCredentials)
    .set({
      ...(Object.fromEntries(fields.map((f) => [f, null])) as Partial<
        ApiCredentials
      >),
      updatedAt: new Date(),
    })
    .where(eq(keywordProApiCredentials.userId, userId));
}
