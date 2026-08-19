'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { api, formatPrice, statusLabel, type OrderSummary } from '@/lib/api';
import '@/app/commande/commande.css';
import '@/app/compte/commandes/orders.css';
import './suivi.css';

function statusTone(status: string) {
  if (status === 'PAID' || status === 'CONFIRMED' || status === 'DELIVERED') {
    return 'is-positive';
  }
  if (
    status === 'CANCELLED' ||
    status === 'RETURNED' ||
    status === 'REFUNDED'
  ) {
    return 'is-muted';
  }
  return 'is-pending';
}

function deliveryLabel(_mode?: string) {
  return 'Livraison';
}

function SuiviInner() {
  const [number, setNumber] = useState('');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const data = await api<OrderSummary>(
        `/orders/by-number/${encodeURIComponent(number.trim())}`,
      );
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commande introuvable');
    } finally {
      setLoading(false);
    }
  }

  const snap = order?.shippingAddressSnap;
  const itemCount =
    order?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main className="checkout-page">
      <div className="checkout-shell suivi-page">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <Link href="/compte">Mon compte</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Suivi</span>
        </nav>

        <header className="checkout-head">
          <h1>Suivi de commande</h1>
          <p>Entrez le numéro de commande reçu par email.</p>
        </header>

        <form className="checkout-summary suivi-form" onSubmit={onSubmit}>
          <div className="checkout-field">
            <label htmlFor="suivi-number">N° de commande</label>
            <input
              id="suivi-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="MD-2026-000011"
              autoComplete="off"
              required
            />
          </div>
          {error ? (
            <p className="checkout-form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="checkout-cta" type="submit" disabled={loading}>
            {loading ? 'Recherche…' : 'Suivre'}
          </button>
        </form>

        {order ? (
          <div className="suivi-result">
            <div className="suivi-result__head">
              <div>
                <h2>Commande {order.number}</h2>
                <p>
                  <span className={`orders-status ${statusTone(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </p>
              </div>
              <p className="suivi-result__total">
                {formatPrice(order.total, order.currency)}
              </p>
            </div>

            <div className="checkout-info-grid">
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
                      {snap.country ? ` · ${snap.country}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="checkout-info-card__muted">—</p>
                )}
              </div>
            </div>

            {order.shipments && order.shipments.length > 0 ? (
              <div className="checkout-summary">
                <strong className="checkout-success__items-title">
                  Expéditions
                </strong>
                <ul className="checkout-success__item-list">
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

            <Link
              href={`/compte/commandes/${order.id}`}
              className="checkout-success__link"
            >
              Voir le détail →
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function SuiviPage() {
  return <RequireAuth next="/suivi">{() => <SuiviInner />}</RequireAuth>;
}
