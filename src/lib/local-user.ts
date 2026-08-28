/**
 * Identity of the single local user.
 *
 * Kept in its own module (no `server-only`) so both the Next runtime and the
 * standalone seed script can import it.
 */
export const LOCAL_USER_ID = 'local-user';

export const LOCAL_USER_EMAIL =
  process.env.LOCAL_USER_EMAIL ?? 'local@keyword-pro.local';

export const LOCAL_USER_NAME = process.env.LOCAL_USER_NAME ?? 'You';
