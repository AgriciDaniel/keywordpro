'use server';

import { getDb } from '@/db';
import { keywordProUserSettings, user } from '@/db/schema';
import { userActionClient } from '@/lib/safe-action';
import {
  getApiCredentials,
  getApiCredentialsStatus,
  upsertApiCredentials,
  type ApiCredentialField,
} from '@/keyword-pro/credentials-db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

type Ctx = { user: { id: string } };

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  preset_avatar: string | null;
}

export const getUserProfile = userActionClient.action(async ({ ctx }) => {
  const userId = (ctx as Ctx).user.id;

  const db = await getDb();
  const [settings] = await db
    .select()
    .from(keywordProUserSettings)
    .where(eq(keywordProUserSettings.userId, userId))
    .limit(1);

  // Until the settings row exists there is nothing to show, and the profile
  // page then presents two "display name" fields with the second one blank
  // beside a sidebar already showing the account name. Seed it from that name
  // so the two agree; saving writes the settings row and takes over.
  const [account] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    success: true,
    profile: {
      display_name: settings?.displayName ?? account?.name ?? null,
      bio: settings?.bio ?? null,
      avatar_url: settings?.avatarUrl ?? null,
      preset_avatar: settings?.presetAvatar ?? null,
    } as UserProfile,
  };
});

const saveUserProfileSchema = z.object({
  display_name: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  preset_avatar: z.string().nullable().optional(),
});

export const saveUserProfile = userActionClient
  .schema(saveUserProfileSchema)
  .action(async ({ parsedInput: profile, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const db = await getDb();
    const values = {
      displayName: profile.display_name ?? null,
      bio: profile.bio ?? null,
      avatarUrl: profile.avatar_url ?? null,
      presetAvatar: profile.preset_avatar ?? null,
    };

    await db
      .insert(keywordProUserSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: keywordProUserSettings.userId,
        set: { ...values, updatedAt: new Date() },
      });

    return { success: true };
  });

// ---------------------------------------------------------------------------
// Connections (provider credentials)
// ---------------------------------------------------------------------------

/**
 * Booleans only. Plaintext keys never leave the server; the form shows a mask
 * for anything already configured.
 */
export const getConnections = userActionClient.action(async ({ ctx }) => {
  const userId = (ctx as Ctx).user.id;
  const configured = await getApiCredentialsStatus(userId);
  return {
    success: true,
    configured,
    env: {
      dataforseo: Boolean(
        process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD,
      ),
    },
  };
});

const saveConnectionsSchema = z.object({
  dataforseoLogin: z.string().nullable().optional(),
  dataforseoPassword: z.string().nullable().optional(),
});

export const saveConnections = userActionClient
  .schema(saveConnectionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    await upsertApiCredentials(userId, parsedInput);
    return { success: true };
  });

const clearConnectionSchema = z.object({
  fields: z.array(
    z.enum(['dataforseoLogin', 'dataforseoPassword']),
  ),
});

export const clearConnection = userActionClient
  .schema(clearConnectionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    await upsertApiCredentials(
      userId,
      Object.fromEntries(
        parsedInput.fields.map((f: ApiCredentialField) => [f, null]),
      ),
    );
    return { success: true };
  });

const testConnectionSchema = z.object({ provider: z.literal('dataforseo') });

/**
 * Live check against the provider, resolving the key the same way a real run
 * would (saved key first, then env). Each call hits the provider's free
 * account/metadata endpoint so testing never spends research budget.
 */
export const testConnection = userActionClient
  .schema(testConnectionSchema)
  .action(async ({ ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const creds = await getApiCredentials(userId);

    try {
      const login =
        creds?.dataforseoLogin?.trim() || process.env.DATAFORSEO_LOGIN;
      const password =
        creds?.dataforseoPassword?.trim() || process.env.DATAFORSEO_PASSWORD;
      if (!login || !password) {
        return { success: false, error: 'No DataForSEO credentials set.' };
      }
      const auth = Buffer.from(`${login}:${password}`).toString('base64');
      const res = await fetch(
        'https://api.dataforseo.com/v3/appendix/user_data',
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (!res.ok) {
        return {
          success: false,
          error: `DataForSEO returned ${res.status}.`,
        };
      }
      // user_data carries the account balance; say it, since every run
      // spends from it.
      const body = (await res.json().catch(() => null)) as {
        tasks?: Array<{ result?: Array<{ money?: { balance?: number } }> }>;
      } | null;
      const balance = body?.tasks?.[0]?.result?.[0]?.money?.balance;
      return {
        success: true,
        message:
          typeof balance === 'number'
            ? `Credentials work. Balance $${balance.toFixed(2)}.`
            : 'DataForSEO credentials work.',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed.',
      };
    }
  });
