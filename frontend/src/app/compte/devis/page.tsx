'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { ProQuotesNotice } from '@/components/ProQuotesNotice';
import { api, formatPrice, QUOTE_ROLES, statusLabel, type QuoteSummary } from '@/lib/api';
import '@/app/commande/commande.css';
import '../commandes/orders.css';
import './quotes.css';

function quoteTone(status: string) {
  if (status === 'SENT' || status === 'ACCEPTED' || status === 'CONVERTED') {
    return 'is-positive';
  }
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') {
    return 'is-muted';
  }
  return 'is-pending';
}

function QuotesInner() {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<QuoteSummary[] | { items: QuoteSummary[] }>('/quotes')
      .then((data) => setQuotes(Array.isArray(data) ? data : data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, []);

  return (
    <main className="checkout-page">
      <div className="checkout-shell quotes-page">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <Link href="/compte">Mon compte</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Devis</span>
        </nav>

        <header className="checkout-head quotes-head">
          <div>
            <h1>Mes devis</h1>
            <p>Suivi de vos demandes professionnelles.</p>
          </div>
          <Link href="/devis" className="checkout-cta quotes-head__cta">
            Nouveau devis
          </Link>
        </header>

        {error ? (
          <p className="checkout-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {quotes === null && !error ? (
          <div className="checkout-skeleton__block orders-skeleton" />
        ) : null}

        {quotes && quotes.length === 0 && !error ? (
          <section className="checkout-empty">
            <h2>Aucun devis</h2>
            <p>Vos demandes de devis apparaîtront ici.</p>
            <Link href="/devis">Demander un devis</Link>
          </section>
        ) : null}

        {quotes && quotes.length > 0 ? (
          <div className="orders-list quotes-list">
            <div className="orders-list__head quotes-list__head" aria-hidden>
              <span>Réf.</span>
              <span>Date</span>
              <span>Destination</span>
              <span>Statut</span>
              <span>Total</span>
              <span />
            </div>
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/compte/devis/${quote.id}`}
                className="orders-row quotes-row"
              >
                <strong className="orders-row__num">
                  {quote.number ?? quote.id.slice(0, 8)}
                </strong>
                <span className="orders-row__date">
                  {new Date(quote.createdAt).toLocaleDateString('fr-MA')}
                </span>
                <span className="quotes-row__dest">
                  {quote.destinationCountry}
                </span>
                <span className={`orders-status ${quoteTone(quote.status)}`}>
                  {statusLabel(quote.status)}
                </span>
                <span className="orders-row__total">
                  {quote.total != null
                    ? formatPrice(quote.total, quote.currency ?? 'MAD')
                    : '—'}
                </span>
                <span className="orders-row__action">Voir</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function QuotesPage() {
  return (
    <RequireAuth roles={QUOTE_ROLES} forbiddenFallback={<ProQuotesNotice />}>
      {() => <QuotesInner />}
    </RequireAuth>
  );
}
