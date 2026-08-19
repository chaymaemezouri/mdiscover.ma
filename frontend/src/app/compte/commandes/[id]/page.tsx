'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { BankTransferProofUpload } from '@/components/payments/BankTransferProofUpload';
import {
  api,
  formatPrice,
  statusLabel,
  type OrderSummary,
  type PaymentRecord,
} from '@/lib/api';
import '@/app/commande/commande.css';
import '../order-detail.css';

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

function OrderDetailInner() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<OrderSummary>(`/orders/${params.id}`),
      api<PaymentRecord[]>(`/payments/order/${params.id}`).catch(() => []),
    ])
      .then(([orderData, paymentData]) => {
        setOrder(orderData);
        setPayments(paymentData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, [params.id]);

  const bankPayment = payments.find(
    (payment) => payment.provider === 'BANK_TRANSFER',
  );

  if (error) {
    return (
      <main className="checkout-page">
        <div className="checkout-shell">
          <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>/</span>
            <Link href="/compte">Mon compte</Link>
            <span aria-hidden>/</span>
            <Link href="/compte/commandes">Commandes</Link>
          </nav>
          <section className="checkout-state">
            <h2>Commande indisponible</h2>
            <p>{error}</p>
            <Link href="/compte/commandes" className="checkout-cta">
              Retour aux commandes
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
          <div className="checkout-skeleton__block order-detail__skeleton" />
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
      <div className="checkout-shell order-detail">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <Link href="/compte">Mon compte</Link>
          <span aria-hidden>/</span>
          <Link href="/compte/commandes">Commandes</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{order.number}</span>
        </nav>

        <header className="checkout-head order-detail__head">
          <h1>Commande {order.number}</h1>
          <p>
            {statusLabel(order.status)} ·{' '}
            {formatPrice(order.total, order.currency)}
          </p>
          <p className="order-detail__date">
            Passée le{' '}
            {new Date(order.createdAt).toLocaleDateString('fr-MA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </header>

        <div className="checkout-info-grid order-detail__grid">
          <div className="checkout-info-card">
            <div className="checkout-info-card__head">
              <strong>Statut</strong>
            </div>
            <p>{statusLabel(order.status)}</p>
            <p className="checkout-info-card__muted">
              {order.shipments?.length
                ? `${order.shipments.length} expédition${
                    order.shipments.length > 1 ? 's' : ''
                  }`
                : 'Pas encore d’expédition'}
            </p>
          </div>
          <div className="checkout-info-card">
            <div className="checkout-info-card__head">
              <strong>Paiement</strong>
            </div>
            <p>{paymentLabel(order.paymentMethod)}</p>
            {bankPayment ? (
              <p className="checkout-info-card__muted">
                {statusLabel(bankPayment.status)}
              </p>
            ) : null}
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
        </div>

        {order.shipments && order.shipments.length > 0 ? (
          <div className="checkout-summary order-detail__panel">
            <strong className="checkout-success__items-title">Suivi</strong>
            <ul className="checkout-success__item-list order-detail__ship-list">
              {order.shipments.map((shipment) => (
                <li key={shipment.id}>
                  <span>
                    {shipment.carrier?.name ?? 'Transporteur'}
                    {shipment.trackingNumber
                      ? ` · ${shipment.trackingNumber}`
                      : ''}
                  </span>
                  <span>{statusLabel(shipment.status)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {order.paymentMethod === 'BANK_TRANSFER' ? (
          <div className="checkout-summary order-detail__panel">
            <strong className="checkout-success__items-title">
              Paiement par virement
            </strong>
            {bankPayment ? (
              <div className="order-detail__proof">
                <BankTransferProofUpload
                  payment={bankPayment}
                  onSubmitted={(updated) =>
                    setPayments((current) =>
                      current.map((payment) =>
                        payment.id === updated.id ? updated : payment,
                      ),
                    )
                  }
                />
              </div>
            ) : (
              <p className="checkout-info-card__muted">
                Le paiement par virement n’a pas encore été initialisé.
              </p>
            )}
          </div>
        ) : null}

        {order.items && order.items.length > 0 ? (
          <div className="checkout-summary order-detail__panel">
            <strong className="checkout-success__items-title">Articles</strong>
            <ul className="checkout-success__item-list">
              {order.items.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.nameFr ?? item.productNameFr ?? 'Produit'} ×
                    {item.quantity}
                  </span>
                  <span>{formatPrice(item.unitPrice, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="checkout-totals order-detail__totals">
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

        <div className="order-detail__actions">
          <Link href="/compte/commandes" className="checkout-success__link">
            ← Toutes les commandes
          </Link>
          <Link href="/catalogue" className="checkout-cta order-detail__cta">
            Continuer mes achats
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderDetailPage() {
  return <RequireAuth>{() => <OrderDetailInner />}</RequireAuth>;
}
