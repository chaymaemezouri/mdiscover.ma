'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';
import {
  api,
  formatPrice,
  mediaUrl,
  statusLabel,
  type PaymentRecord,
  type SafeUser,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../../admin-utils';
import {
  bankDetails,
  isImageProof,
  payLabel,
  paymentClientName,
} from '../payment-helpers';

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function load() {
    setLoading(true);
    Promise.all([
      api<PaymentRecord>(`/payments/admin/${id}`),
      api<SafeUser>('/users/me').catch(() => null),
    ])
      .then(([data, me]) => {
        setPayment(data);
        setUser(me);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Paiement introuvable'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      flash(`${label} copié.`);
    } catch {
      setError('Copie impossible');
    }
  }

  async function confirmBank() {
    if (!payment) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/payments/admin/${payment.id}/confirm`, { method: 'PATCH' });
      flash('Virement confirmé.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmation impossible');
    } finally {
      setBusy(false);
    }
  }

  async function confirmCod() {
    if (!payment) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/payments/admin/${payment.id}/confirm-cod`, {
        method: 'PATCH',
      });
      flash('COD encaissé.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Encaissement impossible');
    } finally {
      setBusy(false);
    }
  }

  async function rejectPayment() {
    if (!payment) return;
    if (reason.trim().length < 3) {
      setError('Indiquez une raison de refus (3 caractères minimum).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/payments/admin/${payment.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setReason('');
      flash('Justificatif refusé.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refus impossible');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !payment) {
    return <p className="ad-loading">Chargement du paiement…</p>;
  }
  if (!payment) {
    return (
      <div>
        <p className="ad-error">{error ?? 'Paiement introuvable.'}</p>
        <Link href="/admin/paiements" className="ad-btn ad-btn--ghost">
          Retour aux paiements
        </Link>
      </div>
    );
  }

  const canModerate = user?.role === 'ADMIN';
  const proofSrc = payment.proofUrl
    ? mediaUrl(payment.proofUrl) ?? payment.proofUrl
    : null;
  const bank = bankDetails(payment);
  const title = payment.order?.number ?? 'Paiement';

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <Link href="/admin/paiements" className="ad-back">
            <ArrowLeft size={14} /> Tous les paiements
          </Link>
          <h1>{title}</h1>
          <p>
            <span
              className={`ad-badge ad-badge--${toneForStatus(payment.status)}`}
            >
              {payLabel(payment.status)}
            </span>
            <span className="ad-muted">
              {' '}
              · {statusLabel(payment.provider)} ·{' '}
              {formatAdminDate(payment.createdAt)}
            </span>
          </p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-icon-btn"
            title="Copier la réf."
            aria-label="Copier la réf."
            onClick={() =>
              void copyText(payment.order?.number ?? payment.id, 'Référence')
            }
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
            <h2>Montant</h2>
            <p>
              <strong>{formatPrice(payment.amount, payment.currency)}</strong>
            </p>
            {payment.paidAt ? (
              <p>Encaissé le {formatAdminDate(payment.paidAt)}</p>
            ) : null}
            {payment.providerRef ? (
              <p>
                Réf. {payment.providerRef}{' '}
                <button
                  type="button"
                  className="ad-card__link"
                  onClick={() =>
                    void copyText(payment.providerRef ?? '', 'Référence')
                  }
                >
                  copier
                </button>
              </p>
            ) : null}
          </section>

          <section className="ad-card">
            <h2>Client</h2>
            <p>
              <strong>{paymentClientName(payment)}</strong>
            </p>
            <div className="ad-order-links">
              {payment.order?.user?.email ? (
                <a href={`mailto:${payment.order.user.email}`}>
                  <Mail size={13} /> {payment.order.user.email}
                </a>
              ) : null}
              {payment.order?.user?.phone ? (
                <a href={`tel:${payment.order.user.phone}`}>
                  <Phone size={13} /> {payment.order.user.phone}
                </a>
              ) : null}
            </div>
            {payment.orderId ? (
              <p style={{ marginTop: '0.55rem' }}>
                <Link href={`/admin/commandes/${payment.orderId}`}>
                  Commande {payment.order?.number ?? ''}
                  {payment.order?.status
                    ? ` · ${statusLabel(payment.order.status)}`
                    : ''}
                </Link>
              </p>
            ) : null}
            {payment.order?.userId ? (
              <p style={{ marginTop: '0.35rem' }}>
                <Link href={`/admin/clients/${payment.order.userId}`}>
                  Fiche client
                </Link>
              </p>
            ) : null}
          </section>

          {bank ? (
            <section className="ad-card">
              <h2>Coordonnées virement</h2>
              <p>{bank.accountName}</p>
              <p>{bank.bankName}</p>
              {bank.iban ? (
                <p>
                  IBAN {bank.iban}{' '}
                  <button
                    type="button"
                    className="ad-card__link"
                    onClick={() => void copyText(String(bank.iban), 'IBAN')}
                  >
                    copier
                  </button>
                </p>
              ) : null}
              {bank.rib ? <p>RIB {bank.rib}</p> : null}
              {bank.reference ? (
                <p>
                  Réf. à indiquer : <strong>{bank.reference}</strong>
                </p>
              ) : null}
            </section>
          ) : null}

          {proofSrc ? (
            <section className="ad-card">
              <h2>Justificatif</h2>
              {isImageProof(proofSrc) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proofSrc}
                  alt="Justificatif de virement"
                  className="ad-proof"
                />
              ) : (
                <p>Fichier PDF ou autre format.</p>
              )}
              <a
                href={proofSrc}
                target="_blank"
                rel="noreferrer"
                className="ad-card__link"
              >
                <ExternalLink size={13} /> Ouvrir en grand
              </a>
            </section>
          ) : payment.provider === 'BANK_TRANSFER' ? (
            <section className="ad-card">
              <h2>Justificatif</h2>
              <p className="ad-muted">Aucun fichier déposé.</p>
            </section>
          ) : null}

          {payment.failureReason ? (
            <section className="ad-card">
              <h2>Motif</h2>
              <p>{payment.failureReason}</p>
            </section>
          ) : null}
        </div>

        <div>
          <section className="ad-card">
            <h2>Actions</h2>
            {!canModerate ? (
              <p className="ad-muted">
                Consultation seule. Un administrateur confirme ou refuse.
              </p>
            ) : null}

            {canModerate &&
            payment.provider === 'BANK_TRANSFER' &&
            (payment.status === 'PROOF_SUBMITTED' ||
              payment.status === 'AWAITING_PROOF') ? (
              <div className="ad-form">
                <div className="ad-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn--green ad-btn--sm"
                    disabled={busy}
                    onClick={() => void confirmBank()}
                  >
                    <Check size={14} /> Confirmer le virement
                  </button>
                </div>
                <label className="ad-field">
                  <span>Motif de refus</span>
                  <input
                    className="ad-input"
                    value={reason}
                    maxLength={300}
                    placeholder="Visible par le client…"
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="ad-btn ad-btn--danger ad-btn--sm"
                  disabled={busy}
                  onClick={() => void rejectPayment()}
                >
                  Refuser le justificatif
                </button>
              </div>
            ) : null}

            {canModerate &&
            payment.provider === 'COD' &&
            (payment.status === 'PENDING' || payment.status === 'PROCESSING') ? (
              <button
                type="button"
                className="ad-btn ad-btn--green ad-btn--sm"
                disabled={busy}
                onClick={() => void confirmCod()}
              >
                <Check size={14} /> Marquer encaissé
              </button>
            ) : null}

            {payment.status === 'SUCCEEDED' ? (
              <p className="ad-muted">Paiement déjà confirmé.</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
