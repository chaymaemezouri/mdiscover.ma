'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, hasSession, type SafeUser } from '@/lib/api';

export function RequireAuth({
  children,
  roles,
  next,
  forbiddenFallback,
}: {
  children: (user: SafeUser) => ReactNode;
  roles?: SafeUser['role'][];
  next?: string;
  forbiddenFallback?: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const redirect =
      next ||
      (typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/');
    if (!hasSession()) {
      router.replace(`/connexion?next=${encodeURIComponent(redirect)}`);
      return;
    }
    api<SafeUser>('/users/me')
      .then((u) => {
        if (roles && !roles.includes(u.role)) {
          setForbidden(true);
          return;
        }
        setUser(u);
      })
      .catch(() => {
        router.replace(`/connexion?next=${encodeURIComponent(redirect)}`);
      });
  }, [router, roles, next]);

  if (forbidden) {
    return (
      <>
        {forbiddenFallback ?? (
          <div className="container section">
            <p>Accès non autorisé</p>
          </div>
        )}
      </>
    );
  }

  if (!user) {
    return (
      <div className="container section">
        <p>Chargement…</p>
      </div>
    );
  }

  return <>{children(user)}</>;
}
