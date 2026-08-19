'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { getToken } from '@/lib/api';
import './LoginPrompt.css';

const STORAGE_KEY = 'md_login_prompt_seen';

const HIDDEN_PREFIXES = [
  '/connexion',
  '/inscription',
  '/admin',
  '/mot-de-passe',
];

function shouldSkipPath(pathname: string) {
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function LoginPrompt() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getToken()) return;
    if (shouldSkipPath(pathname)) return;
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return;

    const id = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function markSeen() {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  function dismiss() {
    markSeen();
  }

  if (!open) return null;

  const next = encodeURIComponent(pathname || '/');

  return (
    <div
      className="login-prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      aria-describedby="login-prompt-desc"
    >
      <button
        type="button"
        className="login-prompt__backdrop"
        aria-label="Fermer"
        onClick={dismiss}
      />
      <div className="login-prompt__panel">
        <span className="login-prompt__icon" aria-hidden>
          <LogIn size={20} strokeWidth={2} />
        </span>
        <h2 id="login-prompt-title">Connectez-vous</h2>
        <p id="login-prompt-desc">
          Connectez-vous pour commander, suivre vos devis et retrouver vos
          favoris.
        </p>
        <div className="login-prompt__actions">
          <button
            ref={closeRef}
            type="button"
            className="login-prompt__ghost"
            onClick={dismiss}
          >
            Plus tard
          </button>
          <Link
            href={`/connexion?next=${next}`}
            className="login-prompt__cta"
            onClick={markSeen}
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
