/**
 * Creates the single local user the app runs as.
 *
 * There is no signup path in this build: `getSession()` resolves this exact row
 * and every research session and credentials record foreign-keys to its id.
 * Safe to run repeatedly.
 */
import { getDb } from '@/db';
import { user } from '@/db/schema';
import { loadEnvConfig } from '@next/env';
import { eq } from 'drizzle-orm';

loadEnvConfig(process.cwd());

async function main() {
  const { LOCAL_USER_EMAIL, LOCAL_USER_ID, LOCAL_USER_NAME } = await import(
    '@/lib/local-user'
  );
  const db = await getDb();
  const now = new Date();

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, LOCAL_USER_ID))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existing) {
    console.log(`Local user already exists (${LOCAL_USER_ID}).`);
    return;
  }

  await db.insert(user).values({
    id: LOCAL_USER_ID,
    name: LOCAL_USER_NAME,
    email: LOCAL_USER_EMAIL,
    image: null,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Seeded local user ${LOCAL_USER_ID}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
