import 'server-only';

import { getDb } from '@/db';
import { user as userTable } from '@/db/schema';
import type { Session, User } from '@/lib/auth-types';
import { eq } from 'drizzle-orm';
import { LOCAL_USER_ID } from '@/lib/local-user';
import { cache } from 'react';

/**
 * Standalone build: there is no login. The app runs as a single local user whose
 * row is seeded by `scripts/seed-local-user.ts` and identified by LOCAL_USER_EMAIL.
 *
 * Resolving a real database row (rather than fabricating an in-memory identity)
 * keeps every foreign key valid: research sessions, opportunities, and the
 * encrypted API-credentials row all hang off `user.id`.
 */

function buildSession(user: User): Session {
  const now = new Date();
  return {
    session: {
      id: 'local-session',
      token: 'local-session',
      userId: user.id,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      ipAddress: '127.0.0.1',
      userAgent: 'local',
    },
    user,
  };
}

/**
 * Get the current session.
 *
 * Always resolves to the single local user. Returns null only if the seed has
 * not run yet, which surfaces as a clear "run pnpm seed" state rather than a
 * confusing redirect loop.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, LOCAL_USER_ID))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return buildSession(row as User);
});

/**
 * Same as getSession but throws instead of returning null. Use in server
 * actions and route handlers that cannot proceed without an identity.
 */
export async function requireLocalUser(): Promise<User> {
  const session = await getSession();
  if (!session?.user) {
    throw new Error(
      'No local user row found. Run `pnpm seed` to create it before starting the app.',
    );
  }
  return session.user;
}
