'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { logout, isProAccount, type SafeUser } from '@/lib/api';
import '@/app/commande/commande.css';
import './compte.css';

function accountKind(user: SafeUser) {
  if (user.role === 'ADMIN' || user.role === 'DEVELOPER') return 'Équipe';
  if (user.role === 'CUSTOMER_PRO') return 'Compte professionnel';
  return 'Compte particulier';
}

function CompteInner({ user }: { user: SafeUser }) {
  const router = useRouter();
  const name = user.individualProfile
    ? `${user.individualProfile.firstName} ${user.individualProfile.lastName}`
    : user.professionalProfile?.companyName ?? user.email;

  const isPro = isProAccount(user);

  const links = [
    {
      href: '/compte/commandes',
      title: 'Mes commandes',
      desc: 'Historique et suivi',
    },
    ...(isPro
      ? [
          {
            href: '/compte/devis',
            title: 'Mes devis',
            desc: 'Demandes et offres',
          },
        ]
      : []),
    {
      href: '/suivi',
      title: 'Suivi rapide',
      desc: 'Par numéro de commande',
    },
    {
      href: '/panier',
      title: 'Panier',
      desc: 'Reprendre vos achats',
    },
    ...(isPro
      ? [
          {
            href: '/devis',
            title: 'Nouveau devis',
            desc: 'Commande professionnelle',
          },
        ]
      : []),
    {
      href: '/contact',
      title: 'Support',
      desc: 'Nous écrire',
    },
  ];

  const isStaff = user.role === 'ADMIN' || user.role === 'DEVELOPER';

  return (
    <main className="checkout-page">
      <div className="checkout-shell compte-page">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Mon compte</span>
        </nav>

        <header className="checkout-head">
          <h1>Bonjour, {name}</h1>
          <p>
            {user.email}
            {user.phone ? ` · ${user.phone}` : ''}
          </p>
        </header>

        <div className="checkout-info-grid compte-profile">
          <div className="checkout-info-card">
            <div className="checkout-info-card__head">
              <strong>Profil</strong>
            </div>
            <p>{name}</p>
            <p className="checkout-info-card__muted">{accountKind(user)}</p>
          </div>
          <div className="checkout-info-card">
            <div className="checkout-info-card__head">
              <strong>Coordonnées</strong>
            </div>
            <p>{user.email}</p>
            <p className="checkout-info-card__muted">{user.phone || '—'}</p>
          </div>
          {user.professionalProfile ? (
            <div className="checkout-info-card">
              <div className="checkout-info-card__head">
                <strong>Entreprise</strong>
              </div>
              <p>{user.professionalProfile.companyName}</p>
              <p className="checkout-info-card__muted">
                {user.professionalProfile.ice
                  ? `ICE ${user.professionalProfile.ice}`
                  : user.professionalProfile.contactPerson}
              </p>
            </div>
          ) : (
            <div className="checkout-info-card">
              <div className="checkout-info-card__head">
                <strong>Espace</strong>
              </div>
              <p>Compte client</p>
              <p className="checkout-info-card__muted">
                {isProAccount(user)
                  ? 'Commandes, devis et suivi'
                  : 'Commandes et suivi'}
              </p>
            </div>
          )}
        </div>

        {isStaff ? (
          <p className="compte-admin">
            <Link href="/admin">Ouvrir le dashboard admin ↗</Link>
          </p>
        ) : null}

        <div className="compte-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="compte-link">
              <strong>{link.title}</strong>
              <span>{link.desc}</span>
            </Link>
          ))}
        </div>

        <div className="compte-logout">
          <button
            type="button"
            className="compte-logout__btn"
            onClick={() => {
              void logout().then(() => router.replace('/'));
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ComptePage() {
  return <RequireAuth>{(user) => <CompteInner user={user} />}</RequireAuth>;
}
