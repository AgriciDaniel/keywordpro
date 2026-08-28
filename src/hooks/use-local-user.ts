'use client';

import { getLocalUser, type LocalUser } from '@/actions/local-user-actions';
import { useEffect, useState } from 'react';

/**
 * Client-side accessor for the single local user.
 *
 * Drop-in replacement for the shape `authClient.useSession()` returned, so the
 * components that used to read `data.user` keep the same call site.
 */
export function useLocalUser(): {
  data: { user: LocalUser } | null;
  isPending: boolean;
  refresh: () => void;
} {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsPending(true);
    getLocalUser()
      .then((result) => {
        if (!cancelled) setUser(result);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return {
    data: user ? { user } : null,
    isPending,
    refresh: () => setNonce((n) => n + 1),
  };
}
