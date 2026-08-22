'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';
import {
  api,
  formatPrice,
  statusLabel,
  type OrderSummary,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../../admin-utils';
import {
  ORDER_ACTION_LABEL,
  clientName,
  formatAddress,
} from '../order-helpers';

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function hydrate(next: OrderSummary) {
    setOrder(next);
    setNote(next.adminNote ?? '');
    setCancelReason(next.cancelReason ?? '');
  }

  function load() {
    setLoading(true);
    api<OrderSummary>(`/orders/${id}`)
      .then((data) => {
        hydrate(data);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Commande introuvable'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setOrderStatus(next: string) {
    if (!order) return;
    if (next === 'CANCELLED' && cancelReason.trim().length < 3) {
      setError('Indiquez un motif d’annulation (3 caractères min.).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const updated = await api<OrderSummary>(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: next,
          note: note.trim() || undefined,
          cancelReason: cancelReason.trim() || undefined,
        }),
      });
      hydrate(updated);
      flash('Statut mis à jour.');
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Mise à jour impossible';
      setError(
        raw.includes('Invalid status transition')
          ? 'Ce changement de statut n’est pas autorisé.'
          : raw.includes('cancelReason')
            ? 'Motif d’annulation requis.'
            : raw,
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api<OrderSummary>(`/admin/orders/${order.id}/note`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      });
      hydrate(updated);
      flash('Note enregistrée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Note impossible');
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      flash(`${label} copié.`);
    } catch {
      setError('Copie impossible');
    }
  }

  if (loading && !order) {
    return <p className="ad-loading">Chargement de la commande…</p>;
  }
  if (!order) {
    return (
      <div>
        <p className="ad-error">{error ?? 'Commande introuvable.'}</p>
        <Link href="/admin/commandes" className="ad-btn ad-btn--ghost">
          Retour aux commandes
        </Link>
      </div>
    );
  }

  const nextStatuses = order.allowedNextStatuses ?? [];

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <Link href="/admin/commandes" className="ad-back">
            <ArrowLeft size={14} /> Toutes les commandes
          </Link>
          <h1>{order.number}</h1>
          <p>
            <span className={`ad-badge ad-badge--${toneForStatus(order.status)}`}>
              {statusLabel(order.status)}
            </span>
            <span className="ad-muted"> · {formatAdminDate(order.createdAt)}</span>
          </p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-icon-btn"
            title="Copier la réf."
            aria-label="Copier la réf."
            onClick={() => void copyText(order.number, 'N° commande')}
          >
            <Copy size={14} />
          </button>
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
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}
      {success ? <p className="ad-success">{success}</p> : null}

      <div className="ad-quote-page">
        <div>
          <section className="ad-card">
            <h2>Client</h2>
            <p>
              <strong>{clientName(order)}</strong>
              {order.user?.role ? ` · ${statusLabel(order.user.role)}` : ''}
            </p>
            <div className="ad-order-links">
              {order.user?.email ? (
                <a href={`mailto:${order.user.email}`}>
                  <Mail size={13} /> {order.user.email}
                </a>
              ) : null}
              {order.shippingAddressSnap?.phone || order.user?.phone ? (
                <a
                  href={`tel:${order.shippingAddressSnap?.phone || order.user?.phone}`}
                >
                  <Phone size={13} />{' '}
                  {order.shippingAddressSnap?.phone || order.user?.phone}
                </a>
              ) : null}
            </div>
            {order.quote ? (
              <p style={{ marginTop: '0.55rem' }}>
                <Link href={`/admin/devis/${order.quote.id}`}>
                  Devis {order.quote.number} · {statusLabel(order.quote.status)}
                </Link>
              </p>
            ) : null}
            {order.user?.id ? (
              <p style={{ marginTop: '0.35rem' }}>
                <Link href={`/admin/clients/${order.user.id}`}>
                  Fiche client
                </Link>
              </p>
            ) : null}
          </section>

          <section className="ad-card">
            <h2>Livraison</h2>
            <p>{statusLabel(order.deliveryMode ?? 'STANDARD')}</p>
            <p>{formatAddress(order.shippingAddressSnap)}</p>
            {order.shippingAddressSnap?.phone ? (
              <p>{order.shippingAddressSnap.phone}</p>
            ) : null}
            <button
              type="button"
              className="ad-card__link"
              onClick={() =>
                void copyText(formatAddress(order.shippingAddressSnap), 'Adresse')
              }
            >
              Copier l’adresse
            </button>
          </section>

          {order.items?.length ? (
            <section className="ad-card">
              <h2>Articles</h2>
              <table className="ad-mini-table">
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.quantity}× {item.nameFr ?? item.productNameFr}
                        {item.sku ? (
                          <span className="ad-muted"> · {item.sku}</span>
                        ) : null}
                      </td>
                      <td>
                        {formatPrice(
                          item.lineTotal ??
                            Number(item.unitPrice ?? 0) * item.quantity,
                          order.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="ad-totals">
                <li>
                  <span>Sous-total</span>
                  <strong>{formatPrice(order.subtotal, order.currency)}</strong>
                </li>
                {Number(order.discount) > 0 ? (
                  <li>
                    <span>Remise {order.promoCodeSnapshot ?? ''}</span>
                    <strong>
                      − {formatPrice(order.discount, order.currency)}
                    </strong>
                  </li>
                ) : null}
                {Number(order.taxAmount) > 0 ? (
                  <li>
                    <span>TVA</span>
                    <strong>
                      {formatPrice(order.taxAmount, order.currency)}
                    </strong>
                  </li>
                ) : null}
                <li>
                  <span>Total</span>
                  <strong>{formatPrice(order.total, order.currency)}</strong>
                </li>
              </ul>
            </section>
          ) : null}

          {order.customerNote ? (
            <section className="ad-card">
              <h2>Note client</h2>
              <p>{order.customerNote}</p>
            </section>
          ) : null}

          {order.history?.length ? (
            <section className="ad-card">
              <h2>Historique</h2>
              <ol className="ad-timeline">
                {order.history.map((h) => (
                  <li key={h.id}>
                    <strong>
                      {h.fromStatus
                        ? `${statusLabel(h.fromStatus)} → ${statusLabel(h.toStatus)}`
                        : statusLabel(h.toStatus)}
                    </strong>
                    <span>{formatAdminDate(h.createdAt)}</span>
                    {h.note ? <em>{h.note}</em> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <div>
          <section className="ad-card">
            <h2>Actions</h2>
            <div className="ad-actions" style={{ marginBottom: '0.75rem' }}>
              {nextStatuses.map((next) => (
                <button
                  key={next}
                  type="button"
                  className={`ad-btn ad-btn--sm${next === 'CANCELLED' || next === 'REFUNDED' ? ' ad-btn--danger' : next === 'DELIVERED' || next === 'PAID' ? ' ad-btn--green' : ''}`}
                  disabled={busy}
                  onClick={() => void setOrderStatus(next)}
                >
                  {ORDER_ACTION_LABEL[next] ?? statusLabel(next)}
                </button>
              ))}
            </div>
            <div className="ad-form">
              <label className="ad-field">
                <span>Note interne</span>
                <textarea
                  className="ad-textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="ad-btn ad-btn--ghost ad-btn--sm"
                disabled={busy}
                onClick={() => void saveNote()}
              >
                Enregistrer la note
              </button>
              {nextStatuses.includes('CANCELLED') ? (
                <label className="ad-field">
                  <span>Motif d’annulation</span>
                  <input
                    className="ad-input"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </label>
              ) : null}
            </div>
          </section>

          <section className="ad-card">
            <h2>Paiement</h2>
            {order.payments?.length ? (
              order.payments.map((p) => (
                <p key={p.id}>
                  <Link href={`/admin/paiements/${p.id}`}>
                    {statusLabel(p.provider)} · {formatPrice(p.amount, p.currency)}
                  </Link>{' '}
                  <span className={`ad-badge ad-badge--${toneForStatus(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                </p>
              ))
            ) : (
              <p>{statusLabel(order.paymentMethod ?? '—')}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
