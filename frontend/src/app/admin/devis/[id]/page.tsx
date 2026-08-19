'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
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
  type QuoteSummary,
} from '@/lib/api';
import { formatAdminDate, formatAdminDay, toneForStatus } from '../../admin-utils';
import { companyOf, defaultValidity, lineName } from '../quote-helpers';

export default function AdminQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState('0');
  const [shippingFee, setShippingFee] = useState('0');
  const [taxRate, setTaxRate] = useState('20');
  const [validity, setValidity] = useState(defaultValidity);
  const [conditions, setConditions] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function hydrate(next: QuoteSummary) {
    const nextPrices: Record<string, string> = {};
    const nextQtys: Record<string, string> = {};
    next.items?.forEach((line) => {
      nextQtys[line.id] = String(line.quantity);
      nextPrices[line.id] =
        line.unitPrice != null ? String(line.unitPrice) : '';
    });
    setPrices(nextPrices);
    setQtys(nextQtys);
    setDiscount(String(next.discount ?? 0));
    setShippingFee(String(next.shippingFee ?? 0));
    setTaxRate(String(next.taxRate ?? 20));
    setValidity(
      next.validityDate
        ? new Date(next.validityDate).toISOString().slice(0, 10)
        : defaultValidity(),
    );
    setConditions(next.conditions ?? '');
    setAdminNote(next.adminNote ?? '');
    setQuote(next);
  }

  function load() {
    setLoading(true);
    api<QuoteSummary>(`/quotes/${id}`)
      .then((data) => {
        hydrate(data);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Devis introuvable'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const preview = useMemo(() => {
    if (!quote?.items?.length) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = quote.items.reduce((sum, item) => {
      const qty = Number(qtys[item.id] || item.quantity || 0);
      const price = Number(prices[item.id] || 0);
      return sum + qty * price;
    }, 0);
    const disc = Number(discount || 0);
    const ship = Number(shippingFee || 0);
    const rate = Number(taxRate || 0);
    const taxable = Math.max(0, subtotal - disc);
    const tax = (taxable * rate) / 100;
    return { subtotal, tax, total: taxable + tax + ship };
  }, [quote, prices, qtys, discount, shippingFee, taxRate]);

  const canPrice = Boolean(
    quote &&
      ['REQUESTED', 'IN_REVIEW', 'MODIFICATION_REQUESTED', 'SENT'].includes(
        quote.status,
      ),
  );
  const canReview = Boolean(
    quote && ['REQUESTED', 'MODIFICATION_REQUESTED'].includes(quote.status),
  );
  const canSend = Boolean(
    quote &&
      ['IN_REVIEW', 'SENT', 'MODIFICATION_REQUESTED'].includes(quote.status),
  );
  const canReject = Boolean(
    quote &&
      ['REQUESTED', 'IN_REVIEW', 'SENT', 'MODIFICATION_REQUESTED'].includes(
        quote.status,
      ),
  );

  async function review() {
    if (!quote) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api<QuoteSummary>(`/admin/quotes/${quote.id}/review`, {
        method: 'PATCH',
      });
      hydrate(next);
      flash('Devis passé en revue.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revue impossible');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!quote) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api<QuoteSummary>(`/admin/quotes/${quote.id}/send`, {
        method: 'POST',
      });
      hydrate(next);
      flash('Devis envoyé au client.');
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes('priced')
          ? 'Enregistrez d’abord les prix (PDF + validité).'
          : e instanceof Error
            ? e.message
            : 'Envoi impossible',
      );
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!quote) return;
    if (rejectReason.trim().length < 3) {
      setError('Indiquez un motif de refus (3 caractères min.).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api<QuoteSummary>(`/admin/quotes/${quote.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      hydrate(next);
      flash('Devis refusé.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refus impossible');
    } finally {
      setBusy(false);
    }
  }

  async function prepare(sendNow: boolean) {
    if (!quote?.items?.length) {
      setError('Ce devis n’a pas de lignes à tarifer.');
      return;
    }
    const missing = quote.items.some(
      (item) => prices[item.id] === '' || Number(prices[item.id]) < 0,
    );
    if (missing) {
      setError('Indiquez un prix unitaire pour chaque ligne.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api<QuoteSummary>(`/admin/quotes/${quote.id}/prepare`, {
        method: 'POST',
        body: JSON.stringify({
          items: quote.items.map((item) => ({
            itemId: item.id,
            quantity: Number(qtys[item.id] || item.quantity) || 1,
            unitPrice: Number(prices[item.id] || 0),
            packaging: item.packaging ?? undefined,
          })),
          discount: Number(discount || 0),
          shippingFee: Number(shippingFee || 0),
          taxRate: Number(taxRate || 20),
          validityDate: new Date(validity).toISOString(),
          conditions: conditions.trim() || undefined,
          adminNote: adminNote.trim() || undefined,
          send: sendNow,
        }),
      });
      hydrate(next);
      flash(sendNow ? 'Devis tarifé et envoyé.' : 'Prix enregistrés, PDF généré.');
      if (!sendNow && next.pdfUrl) {
        window.open(
          mediaUrl(next.pdfUrl) ?? next.pdfUrl,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Préparation impossible');
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

  if (loading && !quote) {
    return <p className="ad-loading">Chargement du devis…</p>;
  }
  if (!quote) {
    return (
      <div>
        <p className="ad-error">{error ?? 'Devis introuvable.'}</p>
        <Link href="/admin/devis" className="ad-btn ad-btn--ghost">
          Retour aux devis
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <Link href="/admin/devis" className="ad-back">
            <ArrowLeft size={14} /> Tous les devis
          </Link>
          <h1>{quote.number ?? 'Devis'}</h1>
          <p>
            <span className={`ad-badge ad-badge--${toneForStatus(quote.status)}`}>
              {statusLabel(quote.status)}
            </span>
            <span className="ad-muted"> · {formatAdminDate(quote.createdAt)}</span>
          </p>
        </div>
        <div className="ad-actions">
          {quote.number ? (
            <button
              type="button"
              className="ad-btn ad-btn--ghost ad-btn--sm"
              onClick={() => void copyText(quote.number ?? '', 'Réf. devis')}
            >
              <Copy size={13} /> Copier la réf.
            </button>
          ) : null}
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            disabled={loading}
            onClick={() => load()}
          >
            <RefreshCw size={13} /> Actualiser
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
              <strong>{companyOf(quote)}</strong>
            </p>
            <p>
              {quote.contactName ||
                quote.user?.professionalProfile?.contactPerson ||
                '—'}
            </p>
            <div className="ad-order-links">
              {quote.contactEmail || quote.user?.email ? (
                <a href={`mailto:${quote.contactEmail || quote.user?.email}`}>
                  <Mail size={13} /> {quote.contactEmail || quote.user?.email}
                </a>
              ) : null}
              {quote.contactPhone || quote.user?.phone ? (
                <a href={`tel:${quote.contactPhone || quote.user?.phone}`}>
                  <Phone size={13} /> {quote.contactPhone || quote.user?.phone}
                </a>
              ) : null}
            </div>
            <p style={{ marginTop: '0.55rem' }}>
              Destination : {quote.destinationCountry}
            </p>
            {quote.companyAddress ? <p>{quote.companyAddress}</p> : null}
            {quote.ice || quote.user?.professionalProfile?.ice ? (
              <p>ICE {quote.ice || quote.user?.professionalProfile?.ice}</p>
            ) : null}
            {quote.user?.id ? (
              <p style={{ marginTop: '0.35rem' }}>
                <Link href={`/admin/clients/${quote.user.id}`}>Fiche client</Link>
              </p>
            ) : null}
            {quote.desiredDeadline ? (
              <p>Échéance souhaitée : {formatAdminDay(quote.desiredDeadline)}</p>
            ) : null}
          </section>

          {quote.message ? (
            <section className="ad-card">
              <h2>Message client</h2>
              <p>{quote.message}</p>
            </section>
          ) : null}

          {quote.clientModificationNote ? (
            <section className="ad-card">
              <h2>Modification demandée</h2>
              <p>{quote.clientModificationNote}</p>
            </section>
          ) : null}

          {quote.items?.length ? (
            <section className="ad-card">
              <h2>Lignes & tarifs</h2>
              <div className="ad-form">
                {quote.items.map((item) => (
                  <div key={item.id} className="ad-quote-line">
                    <p>
                      <strong>{lineName(item)}</strong>
                      <span className="ad-muted">
                        {item.sku ? ` · ${item.sku}` : ''}
                        {item.packaging ? ` · ${item.packaging}` : ''}
                      </span>
                    </p>
                    <div className="ad-form ad-form--2">
                      <label className="ad-field">
                        <span>Qté</span>
                        <input
                          className="ad-input"
                          type="number"
                          min="1"
                          disabled={!canPrice}
                          value={qtys[item.id] ?? item.quantity}
                          onChange={(e) =>
                            setQtys((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="ad-field">
                        <span>Prix unit. MAD</span>
                        <input
                          className="ad-input"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!canPrice}
                          value={prices[item.id] ?? ''}
                          onChange={(e) =>
                            setPrices((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
                {canPrice ? (
                  <>
                    <div className="ad-form ad-form--2">
                      <label className="ad-field">
                        <span>Remise MAD</span>
                        <input
                          className="ad-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                        />
                      </label>
                      <label className="ad-field">
                        <span>Frais de port</span>
                        <input
                          className="ad-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(e.target.value)}
                        />
                      </label>
                      <label className="ad-field">
                        <span>TVA %</span>
                        <input
                          className="ad-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                        />
                      </label>
                      <label className="ad-field">
                        <span>Validité</span>
                        <input
                          className="ad-input"
                          type="date"
                          value={validity}
                          onChange={(e) => setValidity(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="ad-field">
                      <span>Conditions</span>
                      <textarea
                        className="ad-textarea"
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </section>
          ) : null}

          {quote.attachments?.length ? (
            <section className="ad-card">
              <h2>Pièces jointes</h2>
              <ul className="ad-doc-list">
                {quote.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={mediaUrl(file.fileUrl) ?? file.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {file.fileName ?? 'Fichier'}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div>
          <section className="ad-card">
            <h2>Total</h2>
            <ul className="ad-totals">
              <li>
                <span>Sous-total</span>
                <strong>{formatPrice(preview.subtotal, quote.currency)}</strong>
              </li>
              <li>
                <span>TVA</span>
                <strong>{formatPrice(preview.tax, quote.currency)}</strong>
              </li>
              <li>
                <span>Total estimé</span>
                <strong>{formatPrice(preview.total, quote.currency)}</strong>
              </li>
            </ul>
            {quote.pdfUrl ? (
              <p style={{ marginTop: '0.75rem' }}>
                <a
                  href={mediaUrl(quote.pdfUrl) ?? quote.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ad-card__link"
                >
                  <ExternalLink size={13} /> Ouvrir le devis PDF
                </a>
              </p>
            ) : null}
            {quote.validityDate ? (
              <p>Valable jusqu’au {formatAdminDay(quote.validityDate)}</p>
            ) : null}
            {quote.order ? (
              <p>
                <Link href={`/admin/commandes/${quote.order.id}`}>
                  Commande {quote.order.number} · {statusLabel(quote.order.status)}
                </Link>
              </p>
            ) : null}
          </section>

          <section className="ad-card">
            <h2>Actions</h2>
            <label className="ad-field">
              <span>Note interne</span>
              <textarea
                className="ad-textarea"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </label>
            <div className="ad-actions" style={{ margin: '0.75rem 0' }}>
              {canReview ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={busy}
                  onClick={() => void review()}
                >
                  Marquer en revue
                </button>
              ) : null}
              {canPrice ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={busy}
                  onClick={() => void prepare(false)}
                >
                  Enregistrer + PDF
                </button>
              ) : null}
              {canPrice ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--green ad-btn--sm"
                  disabled={busy}
                  onClick={() => void prepare(true)}
                >
                  Tarifer et envoyer
                </button>
              ) : null}
              {canSend && quote.pdfUrl ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--sm"
                  disabled={busy}
                  onClick={() => void send()}
                >
                  Envoyer
                </button>
              ) : null}
            </div>
            {canReject ? (
              <div className="ad-form">
                <label className="ad-field">
                  <span>Motif de refus</span>
                  <input
                    className="ad-input"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Visible en interne…"
                  />
                </label>
                <button
                  type="button"
                  className="ad-btn ad-btn--danger ad-btn--sm"
                  disabled={busy}
                  onClick={() => void reject()}
                >
                  Refuser le devis
                </button>
              </div>
            ) : null}
          </section>

          {quote.history?.length ? (
            <section className="ad-card">
              <h2>Historique</h2>
              <ol className="ad-timeline">
                {quote.history.map((h) => (
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
      </div>
    </div>
  );
}
