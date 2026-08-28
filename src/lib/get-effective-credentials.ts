import 'server-only';

import { getApiCredentials } from '@/keyword-pro/credentials-db';
import { ByokKeysRequiredError } from './byok-guard';
import { getSession } from './server';

/**
 * Credential resolution for the standalone build.
 *
 * The original app had a `cloud` vs `byok` split on the user record: cloud mode
 * used platform env vars, byok mode used the user's stored keys and never mixed
 * the two. There is no platform here, so that distinction is gone.
 *
 * Resolution order is now simply:
 *   1. the key saved on the Connections tab (encrypted in the database)
 *   2. the matching environment variable
 *
 * Falling back to env keeps a `.env`-only setup working with no UI step, while
 * the Connections tab takes precedence once a key is entered there.
 */

async function resolveUserId(userId?: string) {
  if (userId) return userId;
  const session = await getSession();
  return session?.user?.id ?? null;
}

async function storedCredentials(userId?: string) {
  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId) return null;
  return getApiCredentials(resolvedUserId);
}

export async function getDataForSeoCredentials(userId?: string): Promise<{
  login: string;
  password: string;
}> {
  const creds = await storedCredentials(userId);

  const login = creds?.dataforseoLogin?.trim() || process.env.DATAFORSEO_LOGIN;
  const password =
    creds?.dataforseoPassword?.trim() || process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new ByokKeysRequiredError(
      'dataforseo',
      ['dataforseo_login', 'dataforseo_password'],
      'DataForSEO credentials required. Add them in Settings → Connections.',
    );
  }

  return { login, password };
}
