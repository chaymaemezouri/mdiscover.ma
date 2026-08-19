'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { api, exchangeGoogleCode, setAuth } from '@/lib/api';

type FieldErrors = {
  email?: string;
  password?: string;
};

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    api<{ google: boolean }>('/auth/providers', { auth: false })
      .then((providers) => setGoogleEnabled(providers.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    const code = search.get('code');
    if (search.get('oauthError')) {
      setError('La connexion avec Google a été annulée ou a échoué.');
      return;
    }
    if (search.get('oauth') !== 'google' || !code) return;

    let cancelled = false;
    setGoogleLoading(true);
    exchangeGoogleCode(code)
      .then((result) => {
        setAuth(result);
        if (cancelled) return;
        const destination =
          safeRedirect(result.next ?? null) ??
          (result.user?.role === 'ADMIN' ||
          result.user?.role === 'DEVELOPER'
            ? '/admin'
            : '/compte');
        router.replace(destination);
      })
      .catch(() => {
        if (!cancelled) {
          setError('La connexion avec Google a échoué. Veuillez réessayer.');
          setGoogleLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router, search]);

  function startGoogleLogin() {
    if (googleLoading) return;
    const next = safeRedirect(
      search.get('next') ?? search.get('redirect'),
    );
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
    const params = new URLSearchParams();
    if (next) params.set('next', next);
    setGoogleLoading(true);
    window.location.assign(
      `${apiBase}/auth/google${params.size ? `?${params}` : ''}`,
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const nextErrors: FieldErrors = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      nextErrors.email = 'Adresse e-mail requise.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Adresse e-mail invalide.';
    }
    if (!password) nextErrors.password = 'Mot de passe requis.';
    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const res = await api<{
        accessToken: string;
        refreshToken: string;
        user?: { role: string };
      }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      setAuth(res);
      const next = safeRedirect(search.get('next') ?? search.get('redirect'));
      if (next) {
        router.replace(next);
        return;
      }
      const me = await api<{ role: string }>('/users/me');
      if (me.role === 'ADMIN' || me.role === 'DEVELOPER') {
        router.replace('/admin');
      } else {
        router.replace('/compte');
      }
    } catch {
      setError(
        'Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth auth--login">
      <div className="auth__panel">
        <div className="auth__panel-inner">
          <div className="auth__login-logo">
            <Image
              src="/logo-login.png"
              alt="Discover"
              width={196}
              height={42}
              priority
              className="auth__login-logo-img"
            />
          </div>
          <div className="auth__head">
            <h1 className="auth__title">Bon retour parmi nous</h1>
            <p className="auth__sub">
              Connectez-vous pour accéder à vos commandes et favoris.
            </p>
          </div>

          {googleEnabled ? (
            <div className="auth__social">
              <GoogleAuthButton
                loading={googleLoading}
                onClick={startGoogleLogin}
              />
              <div className="auth__separator" aria-hidden>
                <span />
                <small>ou</small>
                <span />
              </div>
            </div>
          ) : null}

          <form className="auth__form" onSubmit={onSubmit} noValidate>
            <label className="auth__field" htmlFor="login-email">
              <span className="auth__label">Adresse e-mail</span>
              <input
                id="login-email"
                className="auth__input"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="nom@entreprise.com"
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? 'login-email-error' : undefined
                }
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                  }
                }}
              />
              {fieldErrors.email ? (
                <span
                  id="login-email-error"
                  className="auth__field-error"
                  role="alert"
                >
                  {fieldErrors.email}
                </span>
              ) : null}
            </label>

            <label className="auth__field" htmlFor="login-password">
              <span className="auth__label">Mot de passe</span>
              <span className="auth__input-wrap">
                <input
                  id="login-password"
                  className="auth__input auth__input--password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password ? 'login-password-error' : undefined
                  }
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((current) => ({
                        ...current,
                        password: undefined,
                      }));
                    }
                  }}
                />
                <button
                  type="button"
                  className="auth__reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
              </span>
              {fieldErrors.password ? (
                <span
                  id="login-password-error"
                  className="auth__field-error"
                  role="alert"
                >
                  {fieldErrors.password}
                </span>
              ) : null}
            </label>

            {error ? (
              <p className="auth__error" role="alert">
                {error}
              </p>
            ) : null}

            <button className="auth__submit" type="submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>

            <p className="auth__switch">
              Pas encore de compte ?{' '}
              <Link href="/inscription">Créer un compte</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
