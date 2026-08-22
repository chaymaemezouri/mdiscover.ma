'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  api,
  apiDownload,
  asList,
  formatPrice,
  statusLabel,
  type OrderSummary,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../admin-utils';
import {
  ORDER_FILTERS,
  clientName,
  type OrderFilterId,
} from './order-helpers';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [filter, setFilter] = useState<OrderFilterId>('all');
  const [payFilter, setPayFilter] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api<OrderSummary[] | { items: OrderSummary[] }>('/admin/orders')
      .then((list) => {
        setOrders(asList(list));
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Erreur commandes'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const open = new URLSearchParams(window.location.search).get('open');
    if (open) {
      router.replace(`/admin/commandes/${open}`);
      return;
    }
    load();
  }, [router]);

  const filtered = useMemo(() => {
    const active = ORDER_FILTERS.find((f) => f.id === filter) ?? ORDER_FILTERS[0];
    const query = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (!active.match(o.status)) return false;
      if (payFilter && o.paymentMethod !== payFilter) return false;
      if (!query) return true;
      const hay = [
        o.number,
        clientName(o),
        o.user?.email,
        o.shippingAddressSnap?.city,
        o.shippingAddressSnap?.phone,
        o.trackingNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [orders, filter, payFilter, q]);

  const counts = useMemo(() => {
    return Object.fromEntries(
      ORDER_FILTERS.map((f) => [
        f.id,
        orders.filter((o) => f.match(o.status)).length,
      ]),
    ) as Record<OrderFilterId, number>;
  }, [orders]);

  const payMethods = useMemo(
    () =>
      [...new Set(orders.map((o) => o.paymentMethod).filter(Boolean))] as string[],
    [orders],
  );

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>Commandes</h1>
          <p>
            {orders.length} commande{orders.length > 1 ? 's' : ''} · suivi,
            documents et expédition.
          </p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-icon-btn"
            title="Actualiser"
            aria-label="Actualiser"
            disabled={loading}
            onClick={() => load()}
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            className="ad-icon-btn"
            title="Export CSV"
            aria-label="Export CSV"
            onClick={() =>
              void apiDownload('/admin/export/orders', 'commandes.csv')
            }
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      <div className="ad-chips">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`ad-chip${filter === f.id ? ' is-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label} · {counts[f.id] ?? 0}
          </button>
        ))}
      </div>

      <div className="ad-toolbar">
        <input
          className="ad-search"
          placeholder="N°, client, ville, téléphone, suivi…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {payMethods.length > 1 ? (
          <select
            className="ad-select"
            style={{ maxWidth: '13rem' }}
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value)}
          >
            <option value="">Tous paiements</option>
            {payMethods.map((m) => (
              <option key={m} value={m}>
                {statusLabel(m)}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Client</th>
              <th>Ville</th>
              <th>Total</th>
              <th>Paiement</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                className="ad-row-click"
                onClick={() => router.push(`/admin/commandes/${o.id}`)}
              >
                <td>
                  <strong>{o.number}</strong>
                  {o.items?.length ? (
                    <span className="ad-muted">
                      {' '}
                      · {o.items.reduce((n, i) => n + i.quantity, 0)} art.
                    </span>
                  ) : null}
                </td>
                <td>{clientName(o)}</td>
                <td>{o.shippingAddressSnap?.city ?? '—'}</td>
                <td>{formatPrice(o.total, o.currency)}</td>
                <td>{statusLabel(o.paymentMethod ?? '—')}</td>
                <td>
                  <span className={`ad-badge ad-badge--${toneForStatus(o.status)}`}>
                    {statusLabel(o.status)}
                  </span>
                </td>
                <td>{formatAdminDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Chargement…
          </p>
        ) : filtered.length === 0 ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Aucune commande sur ce filtre.
          </p>
        ) : null}
      </div>
    </div>
  );
}
