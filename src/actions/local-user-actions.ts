'use server';

import { getDb } from '@/db';
import { user as userTable } from '@/db/schema';
import { getSession } from '@/lib/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Replaces better-auth's `authClient.useSession()` for the standalone build.
 *
 * Client components used to read the signed-in user from better-auth. There is
 * no auth provider now, so they read the single local user through this action.
 * Only display fields cross the boundary; nothing sensitive.
 */
export type LocalUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function getLocalUser(): Promise<LocalUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}

export async function updateLocalUserName(
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { success: false, error: 'Name must be 3-30 characters.' };
  }

  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: 'No local user found. Run `pnpm seed`.' };
  }

  const db = await getDb();
  await db
    .update(userTable)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(userTable.id, session.user.id));

  revalidatePath('/', 'layout');
  return { success: true };
}
