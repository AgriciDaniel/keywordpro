import type { user as userTable } from '@/db/schema';

/**
 * Standalone build: there is no authentication provider. These types are derived
 * from the `user` table directly rather than from better-auth's inferred session.
 * A single local user row is seeded at startup and returned by `getSession()`.
 */
export type User = typeof userTable.$inferSelect & {
  currentCredits?: number | null;
  platformCredits?: number | null;
  nonExpiringCredits?: number | null;
  hasActiveSubscription?: boolean | null;
  hasPaidHistory?: boolean | null;
  status?: 'active' | 'banned';
};

export type Session = {
  session: {
    id: string;
    token: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: User;
};
