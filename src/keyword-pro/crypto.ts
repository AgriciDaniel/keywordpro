import 'server-only';

import crypto from 'node:crypto';
import { logger } from '@/lib/logger';
import {
  decodeBase64EncryptionKey,
  resolveAuthSecretFallbackAllowed,
  resolveEncryptionKeyring,
  resolvePrimaryEncryptionKey,
  type EncryptionKeyringSource,
  type PrimaryEncryptionKeySource,
} from '@/lib/runtime-environment';

// SEC-10-M key-versioning notes:
//
// Wire format for encrypted secrets is one of:
//
//   v1:<iv>:<tag>:<ct>           Single-key era. Decrypts with the LEGACY_KID
//                                 key (sourced from a Keyword Pro single key,
//                                 its temporary legacy alias, or the explicitly
//                                 enabled BETTER_AUTH_SECRET dev fallback).
//                                 Emitted when the new keyring is NOT opted
//                                 into, so pre-existing deployments stay
//                                 bit-for-bit identical.
//
//   v2:<kid>:<iv>:<tag>:<ct>     Keyring era. <kid> selects which key in
//                                 KEYWORD_PRO_ENCRYPTION_KEYS decrypts.
//                                 Emitted whenever a keyring is set. Rotation
//                                 means adding a kid and selecting it with
//                                 KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE.
//
// Keyring env format:
//   KEYWORD_PRO_ENCRYPTION_KEYS="kid1:<base64-32B>,kid2:<base64-32B>"
//   KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE="kid2"   # picks write kid
//
// The single-key configuration is always registered under kid="legacy" so v1
// ciphertexts keep decrypting during and after a rotation. Rankenstein-named
// variables are temporary compatibility aliases and must agree with their
// canonical Keyword Pro equivalents when both are configured.

type KeySource =
  | PrimaryEncryptionKeySource
  | 'BETTER_AUTH_SECRET'
  | EncryptionKeyringSource;

type KeyringEntry = {
  kid: string;
  key: Buffer;
  source: KeySource;
};

type Keyring = {
  keys: Map<string, KeyringEntry>;
  activeKid: string;
};

const LEGACY_KID = 'legacy';
const V1_PREFIX = 'v1';
const V2_PREFIX = 'v2';

let fallbackWarningLogged = false;

function getLegacyKeyEntry(): KeyringEntry | null {
  const explicit = resolvePrimaryEncryptionKey(process.env);
  if (explicit) {
    return {
      kid: LEGACY_KID,
      key: decodeBase64EncryptionKey(explicit.value, explicit.source),
      source: explicit.source,
    };
  }

  const allowFallback = resolveAuthSecretFallbackAllowed(process.env);

  if (!allowFallback) return null;

  const isProduction =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build';

  if (isProduction) {
    throw new Error(
      'Missing KEYWORD_PRO_ENCRYPTION_KEY in production. Refusing BETTER_AUTH_SECRET fallback.'
    );
  }

  const fallback = process.env.BETTER_AUTH_SECRET;
  if (!fallback) return null;

  if (!fallbackWarningLogged) {
    logger.warn(
      'Using BETTER_AUTH_SECRET as encryption key fallback. This is NOT recommended for production. Set KEYWORD_PRO_ENCRYPTION_KEY instead. If BETTER_AUTH_SECRET is rotated, previously encrypted API credentials will be unrecoverable.',
      { event: 'crypto.encryptionKey.fallback' }
    );
    fallbackWarningLogged = true;
  }

  return {
    kid: LEGACY_KID,
    key: crypto.createHash('sha256').update(fallback).digest(),
    source: 'BETTER_AUTH_SECRET',
  };
}

function keyringOptedIn(): boolean {
  return resolveEncryptionKeyring(process.env) !== null;
}

function getKeyring(): Keyring {
  const configuredKeyring = resolveEncryptionKeyring(process.env);
  const legacyEntry = getLegacyKeyEntry();

  const keys = new Map<string, KeyringEntry>();
  if (legacyEntry) {
    keys.set(legacyEntry.kid, legacyEntry);
  }

  if (configuredKeyring) {
    for (const [kid, buf] of configuredKeyring.keys) {
      keys.set(kid, { kid, key: buf, source: configuredKeyring.source });
    }
  }

  if (keys.size === 0) {
    throw new Error(
      'Missing Keyword Pro encryption configuration. Set a single key or keyring. ' +
        'Fallback to BETTER_AUTH_SECRET is disabled by default for security.'
    );
  }

  let activeKid: string;
  if (configuredKeyring) {
    if (!keys.has(configuredKeyring.activeKid)) {
      throw new Error(
        `KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE="${configuredKeyring.activeKid}" is not present in the keyring. ` +
          `Available kids: ${[...keys.keys()].join(', ')}.`
      );
    }
    activeKid = configuredKeyring.activeKid;
  } else {
    activeKid = LEGACY_KID;
  }

  return { keys, activeKid };
}

/**
 * Validate encryption key configuration at startup.
 * Throws if no key is available. Logs a warning if the active key is a
 * dev-only fallback. Returns observability fields so callers can log a
 * one-time health signal.
 */
export function validateEncryptionConfig(): {
  source: KeySource;
  isSecure: boolean;
  activeKid: string;
  kids: string[];
} {
  const keyring = getKeyring();
  const active = keyring.keys.get(keyring.activeKid);
  if (!active) {
    throw new Error(
      `Active kid "${keyring.activeKid}" not found in keyring - unreachable.`
    );
  }

  const isSecure = active.source !== 'BETTER_AUTH_SECRET';

  if (!isSecure) {
    logger.warn(
      'Encryption key validation: Using fallback key. Set KEYWORD_PRO_ENCRYPTION_KEY for production deployments.',
      { event: 'crypto.encryptionKey.validationFallback' }
    );
  }

  return {
    source: active.source,
    isSecure,
    activeKid: keyring.activeKid,
    kids: [...keyring.keys.keys()],
  };
}

export function isEncryptedSecretEnvelope(
  value?: string | null
): value is string {
  if (!value) return false;
  return (
    value.startsWith(`${V1_PREFIX}:`) || value.startsWith(`${V2_PREFIX}:`)
  );
}

export function encryptSecret(plaintext: string): string {
  const keyring = getKeyring();
  const entry = keyring.keys.get(keyring.activeKid);
  if (!entry) {
    throw new Error(
      `Active kid "${keyring.activeKid}" missing from keyring - unreachable.`
    );
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', entry.key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  if (!keyringOptedIn()) {
    // Pre-keyring wire format. Zero-diff for deployments that haven't set
    // KEYWORD_PRO_ENCRYPTION_KEYS yet.
    return [
      V1_PREFIX,
      iv.toString('base64'),
      tag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  return [
    V2_PREFIX,
    entry.kid,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

function decryptWithKey(
  key: Buffer,
  ivB64: string,
  tagB64: string,
  ciphertextB64: string
): string {
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

export function decryptSecret(envelope: string): string {
  if (!isEncryptedSecretEnvelope(envelope)) {
    return envelope;
  }

  try {
    const keyring = getKeyring();

    if (envelope.startsWith(`${V1_PREFIX}:`)) {
      const parts = envelope.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid secret envelope format.');
      }
      const [, ivB64, tagB64, ciphertextB64] = parts;
      if (!ivB64 || !tagB64 || !ciphertextB64) {
        throw new Error('Invalid secret envelope format.');
      }
      const legacy = keyring.keys.get(LEGACY_KID);
      if (!legacy) {
        throw new Error(
          'Cannot decrypt v1 envelope: no legacy key available. ' +
            'Restore KEYWORD_PRO_ENCRYPTION_KEY or its legacy alias so pre-rotation ciphertexts keep decrypting.'
        );
      }
      return decryptWithKey(legacy.key, ivB64, tagB64, ciphertextB64);
    }

    // v2:<kid>:<iv>:<tag>:<ct>
    const parts = envelope.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid secret envelope format.');
    }
    const [, kid, ivB64, tagB64, ciphertextB64] = parts;
    if (!kid || !ivB64 || !tagB64 || !ciphertextB64) {
      throw new Error('Invalid secret envelope format.');
    }
    const entry = keyring.keys.get(kid);
    if (!entry) {
      throw new Error(
        `Unknown encryption kid "${kid}". This ciphertext was encrypted with a key ` +
          `that is not in KEYWORD_PRO_ENCRYPTION_KEYS. Restore the key to decrypt.`
      );
    }
    return decryptWithKey(entry.key, ivB64, tagB64, ciphertextB64);
  } catch (error) {
    // A decrypt failure means a stored credential silently stops working, so
    // make it loud in the local console rather than swallowing it.
    console.error(
      '[crypto] failed to decrypt stored credential',
      `${envelope.slice(0, Math.min(envelope.length, 16))}…`,
      (error as Error)?.message ?? String(error),
    );
    throw error;
  }
}

export function encryptOptionalSecret(value?: string | null): string | null {
  if (!value) return null;
  return encryptSecret(value);
}

export function decryptOptionalSecret(value?: string | null): string | null {
  if (!value) return null;
  return decryptSecret(value);
}
