'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { ProQuotesNotice } from '@/components/ProQuotesNotice';
import { api, QUOTE_ROLES, type QuoteSummary } from '@/lib/api';
import '../devis.css';

function SuccessStepper({ isExport }: { isExport: boolean }) {
  const steps = [
    'Entreprise',
    'Produits',
    isExport ? 'Export' : 'Livraison',
    'Vérification',
  ];
  return (
    <ol className="devis-stepper" aria-label="Progression">
      {steps.map((label, i, arr) => (
        <li key={label} className="devis-stepper__item is-done">
          {i < arr.length - 1 ? (
            <span className="devis-stepper__line" aria-hidden />
          ) : null}
          <span className="devis-stepper__dot" aria-hidden>
            ✓
          </span>
          <span className="devis-stepper__label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function SuccessCrumbs() {
  return (
    <nav className="devis-crumbs" aria-label="Fil d’Ariane">
      <Link href="/">Accueil</Link>
      <span aria-hidden>/</span>
      <Link href="/devis">Devis</Link>
      <span aria-hidden>/</span>
      <span aria-current="page">Confirmation</span>
    </nav>
  );
}

function SuccessInner() {
  const search = useSearchParams();
  const quoteId = search.get('id');
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) {
      setError('Demande introuvable.');
      return;
    }
    api<QuoteSummary>(`/quotes/${quoteId}`)
      .then(setQuote)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : 'Impossible de charger la demande',
        ),
      );
  }, [quoteId]);

  const itemCount = quote?.items?.length ?? 0;
  const isExport = useMemo(() => {
    const country = quote?.destinationCountry?.toUpperCase() ?? 'MA';
    return country !== 'MA' && country !== 'MAROC' && country !== 'MOROCCO';
  }, [quote?.destinationCountry]);

  if (error) {
    return (
      <main className="devis-page">
        <div className="devis-shell">
          <SuccessCrumbs />
          <div className="devis-state">
            <h2>Demande introuvable</h2>
            <p>{error}</p>
            <Link href="/devis">Nouvelle demande</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="devis-page" aria-busy="true">
        <div className="devis-shell">
          <SuccessCrumbs />
          <div className="devis-state">
            <h2>Chargement…</h2>
          </div>
        </div>
      </main>
    );
  }

  const ref = quote.number ?? quote.id;

  return (
    <main className="devis-page">
      <div className="devis-shell">
        <SuccessCrumbs />

        <header className="devis-head devis-success-head">
          <div className="devis-success__hero">
            <span className="devis-success__mark" aria-hidden>
              <Check size={20} strokeWidth={2.5} />
            </span>
            <div>
              <h1>Demande envoyée</h1>
              <p className="devis-success__sub">
                Votre demande a bien été transmise à notre équipe commerciale.
              </p>
              <p className="devis-success__ref">
                Demande <strong>{ref}</strong>
              </p>
            </div>
          </div>
          <SuccessStepper isExport={isExport} />
        </header>

        <div className="devis-success">
          <div className="devis-info-grid">
            <div className="devis-info-card">
              <div className="devis-info-card__head">
                <strong>Type</strong>
              </div>
              <p>
                {isExport
                  ? 'Export international'
                  : 'Commande professionnelle Maroc'}
              </p>
            </div>
            <div className="devis-info-card">
              <div className="devis-info-card__head">
                <strong>Produits</strong>
              </div>
              <p>
                {itemCount} référence{itemCount > 1 ? 's' : ''}
              </p>
              {quote.companyName ? (
                <p className="devis-info-card__muted">{quote.companyName}</p>
              ) : null}
            </div>
            <div className="devis-info-card">
              <div className="devis-info-card__head">
                <strong>Destination</strong>
              </div>
              <p>{quote.destinationCountry}</p>
              {quote.contactName ? (
                <p className="devis-info-card__muted">{quote.contactName}</p>
              ) : null}
            </div>
            <div className="devis-info-card">
              <div className="devis-info-card__head">
                <strong>Contact</strong>
              </div>
              <p>{quote.contactEmail ?? '—'}</p>
              {quote.contactPhone ? (
                <p className="devis-info-card__muted">{quote.contactPhone}</p>
              ) : null}
            </div>
          </div>

          {quote.items && quote.items.length > 0 ? (
            <div className="devis-success__items">
              <strong className="devis-success__items-title">
                Produits demandés
              </strong>
              <ul className="devis-success__item-list">
                {quote.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.nameFr ?? item.product?.nameFr ?? 'Produit'} ×
                      {item.quantity}
                    </span>
                    {item.packaging ? <span>{item.packaging}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="devis-success__actions">
            <Link
              href={`/compte/devis/${quote.id}`}
              className="devis-cta devis-success__cta"
            >
              Voir ma demande
            </Link>
            <Link href="/catalogue" className="devis-success__link">
              Retour au catalogue
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DevisSuccessPage() {
  return (
    <RequireAuth roles={QUOTE_ROLES} forbiddenFallback={<ProQuotesNotice />}>
      {() => (
        <Suspense
          fallback={
            <main className="devis-page" aria-busy="true">
              <div className="devis-shell">
                <SuccessCrumbs />
                <div className="devis-state">
                  <h2>Chargement…</h2>
                </div>
              </div>
            </main>
          }
        >
          <SuccessInner />
        </Suspense>
      )}
    </RequireAuth>
  );
}
