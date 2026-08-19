'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { api, setAuth, type SafeUser } from '@/lib/api';

type Tab = 'individual' | 'pro';
type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  sector: string;
  ice: string;
  city: string;
};
type Errors = Partial<Record<keyof Fields | 'terms' | 'form', string>>;

const EMPTY: Fields = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  sector: '',
  ice: '',
  city: '',
};

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export default function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    search.get('type') === 'pro' ? 'pro' : 'individual',
  );
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleUser, setGoogleUser] = useState<SafeUser | null>(null);
  const googleComplete = search.get('googleComplete') === '1';
  const finalRedirect = safeRedirect(
    search.get('next') ?? search.get('redirect'),
  );

  useEffect(() => {
    api<{ google: boolean }>('/auth/providers', { auth: false })
      .then((providers) => setGoogleEnabled(providers.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (!googleComplete) return;
    api<SafeUser>('/users/me')
      .then((user) => {
        setGoogleUser(user);
        const name = user.individualProfile;
        setFields((current) => ({
          ...current,
          firstName: name?.firstName ?? '',
          lastName: name?.lastName ?? '',
          email: user.email,
          phone: user.phone ?? '',
          companyName: user.professionalProfile?.companyName ?? '',
        }));
      })
      .catch(() => router.replace('/connexion'));
  }, [googleComplete, router]);

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    }
  }

  function changeTab(next: Tab) {
    setTab(next);
    setErrors({});
  }

  function validate() {
    const next: Errors = {};
    if (fields.firstName.trim().length < 2) next.firstName = 'Prénom requis.';
    if (fields.lastName.trim().length < 2) next.lastName = 'Nom requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      next.email = 'Adresse e-mail invalide.';
    }
    if (fields.password.length < 8) {
      next.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    } else if (!/[A-Za-z]/.test(fields.password) || !/\d/.test(fields.password)) {
      next.password = 'Ajoutez au moins une lettre et un chiffre.';
    }
    if (fields.confirmPassword !== fields.password) {
      next.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }
    if (tab === 'pro' && fields.companyName.trim().length < 2) {
      next.companyName = 'Raison sociale requise.';
    }
    if (!accepted) next.terms = 'Vous devez accepter les conditions.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const endpoint =
        tab === 'individual'
          ? '/auth/register/individual'
          : '/auth/register/professional';
      const body =
        tab === 'individual'
          ? {
              email: fields.email.trim(),
              password: fields.password,
              firstName: fields.firstName.trim(),
              lastName: fields.lastName.trim(),
              phone: fields.phone.trim() || undefined,
            }
          : {
              email: fields.email.trim(),
              password: fields.password,
              companyName: fields.companyName.trim(),
              contactPerson: `${fields.firstName.trim()} ${fields.lastName.trim()}`,
              sector: fields.sector || undefined,
              ice: fields.ice.trim() || undefined,
              phone: fields.phone.trim() || undefined,
              billingAddress: fields.city.trim() || undefined,
            };
      const result = await api<{ accessToken: string; refreshToken: string }>(
        endpoint,
        {
          method: 'POST',
          auth: false,
          body: JSON.stringify(body),
        },
      );
      setAuth(result);
      router.replace(finalRedirect ?? '/compte');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/already|exist|utilis/i.test(message)) {
        setErrors({
          email: 'Un compte existe déjà avec cette adresse.',
          form: 'Connectez-vous avec ce compte ou utilisez une autre adresse.',
        });
      } else {
        setErrors({ form: 'Inscription impossible. Vérifiez les informations.' });
      }
    } finally {
      setLoading(false);
    }
  }

  function startGoogle() {
    if (googleLoading) return;
    const params = new URLSearchParams({
      googleComplete: '1',
      type: tab,
    });
    if (finalRedirect) params.set('next', finalRedirect);
    const next = `/inscription?${params}`;
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
    setGoogleLoading(true);
    window.location.assign(
      `${apiBase}/auth/google?${new URLSearchParams({ next })}`,
    );
  }

  async function finishGoogleProfessional() {
    const next: Errors = {};
    if (fields.companyName.trim().length < 2) {
      next.companyName = 'Raison sociale requise.';
    }
    if (!accepted) next.terms = 'Vous devez accepter les conditions.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const result = await api<{ accessToken: string; refreshToken: string }>(
        '/auth/google/complete-professional',
        {
          method: 'POST',
          body: JSON.stringify({
            companyName: fields.companyName.trim(),
            contactPerson:
              `${fields.firstName.trim()} ${fields.lastName.trim()}`.trim() ||
              googleUser?.email,
            sector: fields.sector || undefined,
            ice: fields.ice.trim() || undefined,
            city: fields.city.trim() || undefined,
          }),
        },
      );
      setAuth(result);
      router.replace(finalRedirect ?? '/compte');
    } catch {
      setErrors({ form: 'Impossible de finaliser le compte professionnel.' });
    } finally {
      setLoading(false);
    }
  }

  function finishGoogleIndividual() {
    if (!accepted) {
      setErrors({ terms: 'Vous devez accepter les conditions.' });
      return;
    }
    router.replace(finalRedirect ?? '/compte');
  }

  const loginHref = finalRedirect
    ? `/connexion?${new URLSearchParams({ next: finalRedirect })}`
    : '/connexion';

  return (
    <main className="auth auth--register">
      <div className="auth__panel">
        <div className="auth__panel-inner">
          <div className="auth__register-logo">
            <Image
              src="/logo-login.png"
              alt="Discover"
              width={196}
              height={42}
              priority
            />
          </div>

          <header className="auth__head">
            <h1 className="auth__title">
              Créer votre <span className="auth__title-accent">compte</span>.
            </h1>
            <p className="auth__sub">
              Particulier pour commander, professionnel pour vos devis et
              volumes B2B.
            </p>
          </header>

          <div className="auth__tabs" role="tablist" aria-label="Type de compte">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'individual'}
              className={`auth__tab${tab === 'individual' ? ' is-active' : ''}`}
              onClick={() => changeTab('individual')}
            >
              Particulier
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'pro'}
              className={`auth__tab${tab === 'pro' ? ' is-active' : ''}`}
              onClick={() => changeTab('pro')}
            >
              Professionnel
            </button>
          </div>
          <p className="auth__type-note">
            {tab === 'individual'
              ? 'Pour vos commandes, favoris et suivi de livraison.'
              : 'Le compte professionnel vous permet de gérer vos demandes de devis et informations d’entreprise.'}
          </p>

          {googleComplete ? (
            <section className="auth__google-complete">
              <strong>Votre compte Google est connecté.</strong>
              <p>
                Vous utilisez DISCOVER comme{' '}
                {tab === 'individual' ? 'particulier' : 'professionnel'}.
              </p>
              {tab === 'pro' ? (
                <div className="auth__company-fields">
                  <p className="auth__section-label">Informations entreprise</p>
                  <Field
                    label="Raison sociale"
                    name="companyName"
                    value={fields.companyName}
                    error={errors.companyName}
                    autoComplete="organization"
                    onChange={(value) => update('companyName', value)}
                  />
                  <div className="auth__row">
                    <SelectField
                      value={fields.sector}
                      onChange={(value) => update('sector', value)}
                    />
                    <Field
                      label="ICE"
                      name="ice"
                      value={fields.ice}
                      onChange={(value) => update('ice', value)}
                    />
                  </div>
                  <Field
                    label="Ville"
                    name="city"
                    value={fields.city}
                    autoComplete="address-level2"
                    onChange={(value) => update('city', value)}
                  />
                </div>
              ) : null}
              <Terms
                checked={accepted}
                error={errors.terms}
                onChange={setAccepted}
              />
              {errors.form ? <p className="auth__error">{errors.form}</p> : null}
              <button
                type="button"
                className="auth__submit"
                disabled={loading}
                onClick={() =>
                  tab === 'pro'
                    ? void finishGoogleProfessional()
                    : finishGoogleIndividual()
                }
              >
                {loading ? 'Finalisation…' : 'Continuer'}
              </button>
            </section>
          ) : (
            <>
              {googleEnabled ? (
                <div className="auth__social">
                  <GoogleAuthButton
                    loading={googleLoading}
                    onClick={startGoogle}
                  />
                  <div className="auth__separator" aria-hidden>
                    <span />
                    <small>ou</small>
                    <span />
                  </div>
                </div>
              ) : null}

              <form className="auth__form" onSubmit={onSubmit} noValidate>
                {tab === 'pro' ? (
                  <p className="auth__section-label">
                    Informations personnelles
                  </p>
                ) : null}
                <div className="auth__row">
                  <Field
                    label="Prénom"
                    name="firstName"
                    value={fields.firstName}
                    error={errors.firstName}
                    autoComplete="given-name"
                    onChange={(value) => update('firstName', value)}
                  />
                  <Field
                    label="Nom"
                    name="lastName"
                    value={fields.lastName}
                    error={errors.lastName}
                    autoComplete="family-name"
                    onChange={(value) => update('lastName', value)}
                  />
                </div>
                <div className="auth__row">
                  <Field
                    label={tab === 'pro' ? 'Email professionnel' : 'Email'}
                    name="email"
                    type="email"
                    value={fields.email}
                    error={errors.email}
                    autoComplete="email"
                    inputMode="email"
                    onChange={(value) => update('email', value)}
                  />
                  <Field
                    label="Téléphone"
                    optional
                    name="phone"
                    type="tel"
                    value={fields.phone}
                    autoComplete="tel"
                    inputMode="tel"
                    onChange={(value) => update('phone', value)}
                  />
                </div>
                <PasswordField
                  id="register-password"
                  label="Mot de passe"
                  value={fields.password}
                  error={errors.password}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                  onChange={(value) => update('password', value)}
                />
                <p className="auth__hint">
                  8 caractères minimum, avec une lettre et un chiffre.
                </p>
                <PasswordField
                  id="register-password-confirmation"
                  label="Confirmer le mot de passe"
                  value={fields.confirmPassword}
                  error={errors.confirmPassword}
                  visible={showConfirmation}
                  onToggle={() => setShowConfirmation((value) => !value)}
                  onChange={(value) => update('confirmPassword', value)}
                />

                {tab === 'pro' ? (
                  <div className="auth__company-fields">
                    <p className="auth__section-label">
                      Informations entreprise
                    </p>
                    <Field
                      label="Raison sociale"
                      name="companyName"
                      value={fields.companyName}
                      error={errors.companyName}
                      autoComplete="organization"
                      onChange={(value) => update('companyName', value)}
                    />
                    <div className="auth__row">
                      <SelectField
                        value={fields.sector}
                        onChange={(value) => update('sector', value)}
                      />
                      <Field
                        label="ICE"
                        optional
                        name="ice"
                        value={fields.ice}
                        onChange={(value) => update('ice', value)}
                      />
                    </div>
                    <Field
                      label="Ville"
                      optional
                      name="city"
                      value={fields.city}
                      autoComplete="address-level2"
                      onChange={(value) => update('city', value)}
                    />
                  </div>
                ) : null}

                <Terms
                  checked={accepted}
                  error={errors.terms}
                  onChange={setAccepted}
                />
                {errors.form ? (
                  <p className="auth__error" role="alert">
                    {errors.form}{' '}
                    {errors.email ? <Link href={loginHref}>Se connecter</Link> : null}
                  </p>
                ) : null}
                <button
                  className="auth__submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Création du compte…' : 'Créer mon compte'}
                </button>
              </form>
            </>
          )}

          <p className="auth__switch">
            Déjà un compte ? <Link href={loginHref}>Se connecter</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  optional,
  name,
  value,
  error,
  type = 'text',
  autoComplete,
  inputMode,
  onChange,
}: {
  label: string;
  optional?: boolean;
  name: keyof Fields;
  value: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: 'email' | 'tel';
  onChange: (value: string) => void;
}) {
  const id = `register-${name}`;
  return (
    <label className="auth__field" htmlFor={id}>
      <span className="auth__label">
        {label}{' '}
        {optional ? <span className="auth__label-opt">(optionnel)</span> : null}
      </span>
      <input
        id={id}
        className="auth__input"
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span id={`${id}-error`} className="auth__field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function PasswordField({
  id,
  label,
  value,
  error,
  visible,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="auth__field" htmlFor={id}>
      <span className="auth__label">{label}</span>
      <span className="auth__input-wrap">
        <input
          id={id}
          className="auth__input auth__input--password"
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="auth__reveal"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          onClick={onToggle}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </span>
      {error ? (
        <span id={`${id}-error`} className="auth__field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="auth__field" htmlFor="register-sector">
      <span className="auth__label">
        Type d’activité <span className="auth__label-opt">(optionnel)</span>
      </span>
      <select
        id="register-sector"
        className="auth__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Sélectionner</option>
        <option value="Distributeur">Distributeur</option>
        <option value="Grossiste">Grossiste</option>
        <option value="Hôtel / Restaurant">Hôtel / Restaurant</option>
        <option value="Commerce">Commerce</option>
        <option value="Entreprise">Entreprise</option>
        <option value="Association">Association</option>
        <option value="Autre">Autre</option>
      </select>
    </label>
  );
}

function Terms({
  checked,
  error,
  onChange,
}: {
  checked: boolean;
  error?: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="auth__terms">
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          J’accepte les <Link href="/legal/cgv">conditions d’utilisation</Link>{' '}
          et la{' '}
          <Link href="/legal/confidentialite">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      {error ? <span className="auth__field-error">{error}</span> : null}
    </div>
  );
}
