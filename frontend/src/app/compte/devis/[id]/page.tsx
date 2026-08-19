'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { ProQuotesNotice } from '@/components/ProQuotesNotice';
import { api, formatPrice, QUOTE_ROLES, statusLabel, type QuoteSummary } from '@/lib/api';
import '@/app/commande/commande.css';
import '../../commandes/orders.css';
import '../../commandes/order-detail.css';
import '../quotes.css';

function quoteTone(status: string) {
  if (status === 'SENT' || status === 'ACCEPTED' || status === 'CONVERTED') {
    return 'is-positive';
  }
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') {
    return 'is-muted';
  }
  return 'is-pending';
}

function QuoteDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<QuoteSummary>(`/quotes/${params.id}`)
      .then(setQuote)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(path: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/quotes/${params.id}/${path}`, { method: 'POST', body: '{}' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  }

  if (error && !quote) {
    return (
      <main className="checkout-page">
        <div className="checkout-shell">
          <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>/</span>
            <Link href="/compte">Mon compte</Link>
            <span aria-hidden>/</span>
            <Link href="/compte/devis">Devis</Link>
          </nav>
          <section className="checkout-state">
            <h2>Devis indisponible</h2>
            <p>{error}</p>
            <Link href="/compte/devis" className="checkout-cta">
              Retour aux devis
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="checkout-page" aria-busy="true">
        <div className="checkout-shell">
          <div className="checkout-skeleton__block order-detail__skeleton" />
          <span className="checkout-sr-only">Chargement…</span>
        </div>
      </main>
    );
  }

  const ref = quote.number ?? quote.id.slice(0, 8);

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <Link href="/compte">Mon compte</Link>
          <span aria-hidden>/</span>
          <Link href="/compte/devis">Devis</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{ref}</span>
        </nav>

        <header className="checkout-head order-detail__head">
          <h1>Devis {ref}</h1>
          <p>
            <span className={`orders-status ${quoteTone(quote.status)}`}>
              {statusLabel(quote.status)}
            </span>
            {' · '}
            {quote.destinationCountry}
          </p>
          <p className="order-detail__date">
            Demandé le{' '}
            {new Date(quote.createdAt).toLocaleDateString('fr-MA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </header>

        {error ? (
          <p className="checkout-form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="checkout-info-grid order-detail__grid">
          <div className="checkout-info-card">
            <div className="checkout-info-card__head">
              <strong>Statut</strong>
            </div>
            <p>{statusLabel(quote.status)}</p>
            <p className="checkout-info-card__muted">
              {quote.destinationCountry}
            </p>
          </div>
          <div className="checkout-info-card">
            <div className="checkout-info-card__head">
              <strong>Contact</strong>
            </div>
            <p>{quote.contactName || quote.companyName || '—'}</p>
            <p className="checkout-info-card__muted">
              {quote.contactEmail || quote.contactPhone || '—'}
            </p>
          </div>
          <div className="checkout-info-card">
            <div className="checkout-info-card__head">
              <strong>Total</strong>
            </div>
            <p>
              {quote.total != null
                ? formatPrice(quote.total, quote.currency ?? 'MAD')
                : 'En préparation'}
            </p>
            {quote.desiredDeadline ? (
              <p className="checkout-info-card__muted">
                Échéance souhaitée :{' '}
                {new Date(quote.desiredDeadline).toLocaleDateString('fr-MA')}
              </p>
            ) : null}
          </div>
        </div>

        {quote.items && quote.items.length > 0 ? (
          <div className="checkout-summary order-detail__panel">
            <strong className="checkout-success__items-title">Articles</strong>
            <ul className="checkout-success__item-list">
              {quote.items.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.product?.nameFr ?? item.nameFr ?? 'Produit'} ×
                    {item.quantity}
                  </span>
                </li>
              ))}
            </ul>
            {quote.total != null ? (
              <div className="checkout-totals order-detail__totals">
                <div className="checkout-totals__grand">
                  <span>Total proposé</span>
                  <span>
                    {formatPrice(quote.total, quote.currency ?? 'MAD')}
                  </span>
                </div>
              </div>
            ) : (
              <p className="checkout-info-card__muted" style={{ marginTop: '0.75rem' }}>
                Offre en cours de préparation.
              </p>
            )}
          </div>
        ) : null}

        {quote.message ? (
          <div className="checkout-summary order-detail__panel">
            <strong className="checkout-success__items-title">Message</strong>
            <p className="quotes-message">{quote.message}</p>
          </div>
        ) : null}

        <div className="order-detail__actions">
          <Link href="/compte/devis" className="checkout-success__link">
            ← Tous les devis
          </Link>
          <div className="quotes-actions">
            {quote.status === 'SENT' ? (
              <>
                <button
                  className="checkout-cta quotes-actions__secondary"
                  disabled={busy}
                  type="button"
                  onClick={() => void act('reject')}
                >
                  Refuser
                </button>
                <button
                  className="checkout-cta"
                  disabled={busy}
                  type="button"
                  onClick={() => void act('accept')}
                >
                  {busy ? 'Traitement…' : 'Accepter'}
                </button>
              </>
            ) : null}
            {quote.status === 'ACCEPTED' ? (
              <button
                className="checkout-cta"
                disabled={busy}
                type="button"
                onClick={() => router.push('/compte/commandes')}
              >
                Voir les commandes
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function QuoteDetailPage() {
  return (
    <RequireAuth roles={QUOTE_ROLES} forbiddenFallback={<ProQuotesNotice />}>
      {() => <QuoteDetailInner />}
    </RequireAuth>
  );
}
