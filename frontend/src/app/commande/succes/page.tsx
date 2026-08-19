'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { BankTransferProofUpload } from '@/components/payments/BankTransferProofUpload';
import {
  api,
  formatPrice,
  statusLabel,
  type OrderSummary,
  type PaymentRecord,
} from '@/lib/api';
import '../commande.css';

type BankDetails = {
  bankName: string;
  iban: string;
  rib: string;
  accountName: string;
  reference: string;
  amount: number;
  currency: string;
};

const STEPS = [
  'Panier',
  'Livraison & paiement',
  'Récapitulatif',
  'Terminé',
] as const;

function paymentLabel(method?: string) {
  switch (method) {
    case 'BANK_TRANSFER':
      return 'Paiement bancaire';
    case 'COD':
      return 'Paiement à la livraison';
    case 'CMI':
      return 'Paiement bancaire';
    default:
      return method ?? '—';
  }
}

function deliveryLabel(_mode?: string) {
  return 'Livraison';
}

function SuccessStepper() {
  return (
    <div className="checkout-stepper" role="list" aria-label="Progression">
      {STEPS.map((label, i, arr) => (
        <div key={label} role="listitem" className="checkout-stepper__step is-done">
          {i < arr.length - 1 ? (
            <span className="checkout-stepper__connector" aria-hidden />
          ) : null}
          <span className="checkout-stepper__circle" aria-hidden>
            ✓
          </span>
          <span className="checkout-stepper__label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function SuccessCrumbs() {
  return (
    <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
      <Link href="/">Accueil</Link>
      <span aria-hidden>/</span>
      <Link href="/panier">Panier</Link>
      <span aria-hidden>/</span>
      <Link href="/commande">Commande</Link>
      <span aria-hidden>/</span>
      <span aria-current="page">Confirmation</span>
    </nav>
  );
}

function SuccessInner() {
  const search = useSearchParams();
  const orderId = search.get('orderId');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Commande introuvable.');
      return;
    }
    Promise.all([
      api<OrderSummary>(`/orders/${orderId}`),
      api<PaymentRecord[]>(`/payments/order/${orderId}`).catch(() => []),
    ])
      .then(([data, payments]) => {
        setOrder(data);
        setPayment(
          payments.find((item) => item.provider === 'BANK_TRANSFER') ?? null,
        );
        try {
          const raw = sessionStorage.getItem(`checkout-bank-${orderId}`);
          if (raw) setBank(JSON.parse(raw) as BankDetails);
          const tip = sessionStorage.getItem(`checkout-instructions-${orderId}`);
          if (tip) setInstructions(tip);
        } catch {
          /* ignore */
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Impossible de charger la commande'),
      );
  }, [orderId]);

  const title = useMemo(() => {
    if (!order) return 'Commande';
    if (order.paymentMethod === 'BANK_TRANSFER') return 'Commande confirmée';
    if (order.paymentMethod === 'COD') return 'Commande confirmée';
    return 'Commande confirmée';
  }, [order]);

  const subtitle = useMemo(() => {
    if (!order) return null;
    if (order.paymentMethod === 'BANK_TRANSFER') {
      return 'Votre commande sera traitée après réception de votre virement.';
    }
    if (order.paymentMethod === 'COD') {
      return 'Vous réglerez à la livraison. Les frais de transport se règlent avec le livreur.';
    }
    return 'Votre commande a bien été enregistrée.';
  }, [order]);

  if (error) {
    return (
      <main className="checkout-page">
        <div className="checkout-shell">
          <SuccessCrumbs />
          <section className="checkout-state">
            <h2>Commande indisponible</h2>
            <p>{error}</p>
            <Link href="/compte/commandes" className="checkout-cta">
              Voir mes commandes
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="checkout-page" aria-busy="true">
        <div className="checkout-shell">
          <SuccessCrumbs />
          <div className="checkout-skeleton__block checkout-success__skeleton" />
          <span className="checkout-sr-only">Chargement…</span>
        </div>
      </main>
    );
  }

  const snap = order.shippingAddressSnap;
  const itemCount =
    order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <SuccessCrumbs />

        <header className="checkout-head checkout-success-head">
          <div className="checkout-success__hero">
            <span className="checkout-success__mark" aria-hidden>
              <Check size={20} strokeWidth={2.5} />
            </span>
            <div>
              <h1>{title}</h1>
              <p className="checkout-success__sub">{subtitle}</p>
              <p className="checkout-success__ref">
                Commande <strong>{order.number}</strong>
              </p>
            </div>
          </div>
          <SuccessStepper />
        </header>

        <div className="checkout-success">
          <div className="checkout-info-grid checkout-success__grid">
            <div className="checkout-info-card">
              <div className="checkout-info-card__head">
                <strong>Paiement</strong>
              </div>
              <p>{paymentLabel(order.paymentMethod)}</p>
              <p className="checkout-info-card__muted">
                {statusLabel(order.status)}
              </p>
            </div>
            <div className="checkout-info-card">
              <div className="checkout-info-card__head">
                <strong>Livraison</strong>
              </div>
              <p>{deliveryLabel(order.deliveryMode)}</p>
              {itemCount > 0 ? (
                <p className="checkout-info-card__muted">
                  {itemCount} produit{itemCount > 1 ? 's' : ''}
                </p>
              ) : null}
            </div>
            <div className="checkout-info-card">
              <div className="checkout-info-card__head">
                <strong>Adresse</strong>
              </div>
              {snap ? (
                <>
                  <p>{snap.line1}</p>
                  <p className="checkout-info-card__muted">
                    {snap.postalCode ? `${snap.postalCode} ` : ''}
                    {snap.city}
                    {snap.region ? `, ${snap.region}` : ''}
                    {snap.country ? ` · ${snap.country}` : ''}
                  </p>
                </>
              ) : (
                <p className="checkout-info-card__muted">—</p>
              )}
            </div>
            <div className="checkout-info-card checkout-info-card--total">
              <div className="checkout-info-card__head">
                <strong>Total</strong>
              </div>
              <p className="checkout-success__amount">
                {formatPrice(order.total, order.currency)}
              </p>
            </div>
          </div>

          {order.items && order.items.length > 0 ? (
            <div className="checkout-summary checkout-success__items">
              <strong className="checkout-success__items-title">
                Articles commandés
              </strong>
              <ul className="checkout-success__item-list">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.nameFr ?? item.productNameFr ?? 'Produit'} ×
                      {item.quantity}
                    </span>
                    {item.unitPrice != null ? (
                      <span>{formatPrice(item.unitPrice, order.currency)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="checkout-totals">
                {order.subtotal != null ? (
                  <div>
                    <span>Sous-total</span>
                    <span>{formatPrice(order.subtotal, order.currency)}</span>
                  </div>
                ) : null}
                <div className="checkout-totals__grand">
                  <span>Total</span>
                  <span>{formatPrice(order.total, order.currency)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {order.paymentMethod === 'BANK_TRANSFER' && bank ? (
            <div className="checkout-summary checkout-success__bank">
              <strong className="checkout-success__items-title">
                Instructions de virement
              </strong>
              <p className="checkout-note checkout-success__bank-lead">
                <Check size={14} aria-hidden />
                {instructions ??
                  'Effectuez le virement avec la référence commande, puis déposez le justificatif ci-dessous.'}
              </p>
              <dl className="checkout-success__bank-rows">
                <div>
                  <dt>Bénéficiaire</dt>
                  <dd>{bank.accountName}</dd>
                </div>
                <div>
                  <dt>Banque</dt>
                  <dd>{bank.bankName}</dd>
                </div>
                <div>
                  <dt>IBAN</dt>
                  <dd>{bank.iban}</dd>
                </div>
                <div>
                  <dt>RIB</dt>
                  <dd>{bank.rib}</dd>
                </div>
                <div>
                  <dt>Référence</dt>
                  <dd>{bank.reference}</dd>
                </div>
                <div>
                  <dt>Montant</dt>
                  <dd>{formatPrice(bank.amount, bank.currency)}</dd>
                </div>
              </dl>
              {payment ? (
                <div className="checkout-success__proof">
                  <BankTransferProofUpload
                    payment={payment}
                    onSubmitted={setPayment}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="checkout-success__actions">
            <Link
              href={`/compte/commandes/${order.id}`}
              className="checkout-cta checkout-success__cta"
            >
              Suivre ma commande
            </Link>
            <Link href="/catalogue" className="checkout-success__link">
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <RequireAuth next="/commande">
      {() => (
        <Suspense
          fallback={
            <main className="checkout-page" aria-busy="true">
              <div className="checkout-shell">
                <SuccessCrumbs />
                <div className="checkout-skeleton__block checkout-success__skeleton" />
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
