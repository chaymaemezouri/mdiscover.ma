'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { api, formatPrice, statusLabel, type OrderSummary } from '@/lib/api';
import '@/app/commande/commande.css';
import './orders.css';

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

function OrdersInner() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<OrderSummary[] | { items: OrderSummary[] }>('/orders')
      .then((data) => setOrders(Array.isArray(data) ? data : data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, []);

  return (
    <main className="checkout-page">
      <div className="checkout-shell orders-page">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <Link href="/compte">Mon compte</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Commandes</span>
        </nav>

        <header className="checkout-head">
          <h1>Mes commandes</h1>
          <p>Historique et statut de vos achats.</p>
        </header>

        {error ? (
          <p className="checkout-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {orders === null && !error ? (
          <div className="checkout-skeleton__block orders-skeleton" />
        ) : null}

        {orders && orders.length === 0 && !error ? (
          <section className="checkout-empty">
            <h2>Aucune commande</h2>
            <p>Vos commandes apparaîtront ici après validation.</p>
            <Link href="/catalogue">Voir le catalogue</Link>
          </section>
        ) : null}

        {orders && orders.length > 0 ? (
          <div className="orders-list">
            <div className="orders-list__head" aria-hidden>
              <span>N°</span>
              <span>Date</span>
              <span>Statut</span>
              <span>Total</span>
              <span />
            </div>
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/compte/commandes/${order.id}`}
                className="orders-row"
              >
                <strong className="orders-row__num">{order.number}</strong>
                <span className="orders-row__date">
                  {new Date(order.createdAt).toLocaleDateString('fr-MA')}
                </span>
                <span className={`orders-status ${statusTone(order.status)}`}>
                  {statusLabel(order.status)}
                </span>
                <span className="orders-row__total">
                  {formatPrice(order.total, order.currency)}
                </span>
                <span className="orders-row__action">Détail</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return <RequireAuth>{() => <OrdersInner />}</RequireAuth>;
}
