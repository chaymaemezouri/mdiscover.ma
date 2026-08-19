'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  type AdminClientDetail,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../../admin-utils';
import { useAdminConfirm } from '../../AdminConfirm';
import {
  clientDisplayName,
  formatAddressLine,
} from '../client-helpers';

type FormState = {
  phone: string;
  locale: string;
  firstName: string;
  lastName: string;
  companyName: string;
  contactPerson: string;
  sector: string;
  ice: string;
  taxId: string;
  tradeRegister: string;
  billingAddress: string;
};

const EMPTY: FormState = {
  phone: '',
  locale: 'FR',
  firstName: '',
  lastName: '',
  companyName: '',
  contactPerson: '',
  sector: '',
  ice: '',
  taxId: '',
  tradeRegister: '',
  billingAddress: '',
};

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [client, setClient] = useState<AdminClientDetail | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useAdminConfirm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function hydrate(next: AdminClientDetail) {
    setClient(next);
    setForm({
      phone: next.phone ?? '',
      locale: next.locale ?? 'FR',
      firstName: next.individualProfile?.firstName ?? '',
      lastName: next.individualProfile?.lastName ?? '',
      companyName: next.professionalProfile?.companyName ?? '',
      contactPerson: next.professionalProfile?.contactPerson ?? '',
      sector: next.professionalProfile?.sector ?? '',
      ice: next.professionalProfile?.ice ?? '',
      taxId: next.professionalProfile?.taxId ?? '',
      tradeRegister: next.professionalProfile?.tradeRegister ?? '',
      billingAddress: next.professionalProfile?.billingAddress ?? '',
    });
  }

  function load() {
    setLoading(true);
    api<AdminClientDetail>(`/admin/users/${id}`)
      .then((data) => {
        hydrate(data);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Client introuvable'),
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

  async function saveProfile() {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api<AdminClientDetail>(`/admin/users/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          phone: form.phone.trim() || undefined,
          locale: form.locale,
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
          contactPerson: form.contactPerson.trim() || undefined,
          sector: form.sector.trim() || undefined,
          ice: form.ice.trim() || undefined,
          taxId: form.taxId.trim() || undefined,
          tradeRegister: form.tradeRegister.trim() || undefined,
          billingAddress: form.billingAddress.trim() || undefined,
        }),
      });
      hydrate(updated);
      flash('Fiche enregistrée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }

  async function review(decision: 'APPROVED' | 'REJECTED') {
    if (!client) return;
    if (decision === 'REJECTED' && rejectReason.trim().length < 3) {
      setError('Indiquez un motif de refus (3 caractères min.).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/users/${client.id}/professional/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          rejectionReason:
            decision === 'REJECTED' ? rejectReason.trim() : undefined,
        }),
      });
      flash(decision === 'APPROVED' ? 'Compte validé.' : 'Compte refusé.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation impossible');
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!client) return;
    const blocked = client.status === 'BLOCKED';
    const ok = await confirm({
      title: blocked ? 'Débloquer ce compte ?' : 'Bloquer ce compte ?',
      description: blocked
        ? `${client.email} pourra de nouveau se connecter.`
        : `${client.email} ne pourra plus se connecter.`,
      confirmLabel: blocked ? 'Débloquer' : 'Bloquer',
      danger: !blocked,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api(
        `/admin/users/${client.id}/${blocked ? 'unblock' : 'block'}`,
        { method: 'PATCH' },
      );
      flash(blocked ? 'Compte débloqué.' : 'Compte bloqué.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !client) {
    return <p className="ad-loading">Chargement du client…</p>;
  }
  if (!client) {
    return (
      <div>
        <p className="ad-error">{error ?? 'Client introuvable.'}</p>
        <Link href="/admin/clients" className="ad-btn ad-btn--ghost">
          Retour aux clients
        </Link>
      </div>
    );
  }

  const pendingPro =
    client.role === 'CUSTOMER_PRO' &&
    client.professionalProfile?.validationStatus === 'PENDING';
  const canBlock = client.role !== 'ADMIN';
  const docs = client.professionalProfile?.documentUrls ?? [];

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <Link href="/admin/clients" className="ad-back">
            <ArrowLeft size={14} /> Tous les clients
          </Link>
          <h1>{clientDisplayName(client)}</h1>
          <p>
            <span className={`ad-badge ad-badge--${toneForStatus(client.role)}`}>
              {statusLabel(client.role)}
            </span>{' '}
            <span
              className={`ad-badge ad-badge--${toneForStatus(
                pendingPro ? 'PENDING' : client.status,
              )}`}
            >
              {pendingPro ? 'En attente' : statusLabel(client.status)}
            </span>
            <span className="ad-muted">
              {' '}
              · inscrit {formatAdminDate(client.createdAt)}
            </span>
          </p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            onClick={() => void copyText(client.email, 'Email')}
          >
            <Copy size={13} /> Copier l’email
          </button>
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
            <h2>Coordonnées</h2>
            <div className="ad-order-links">
              <a href={`mailto:${client.email}`}>
                <Mail size={13} /> {client.email}
              </a>
              {client.phone ? (
                <a href={`tel:${client.phone}`}>
                  <Phone size={13} /> {client.phone}
                </a>
              ) : null}
            </div>
            <p style={{ marginTop: '0.55rem' }}>
              Langue : {client.locale === 'EN' ? 'English' : 'Français'}
            </p>
            <p>Dernière connexion : {formatAdminDate(client.lastLoginAt)}</p>
            {client.professionalProfile?.contactPerson ? (
              <p>Contact : {client.professionalProfile.contactPerson}</p>
            ) : null}
            {client.professionalProfile?.ice ? (
              <p>ICE {client.professionalProfile.ice}</p>
            ) : null}
            {client.professionalProfile?.taxId ? (
              <p>IF / Tax ID {client.professionalProfile.taxId}</p>
            ) : null}
            {client.professionalProfile?.tradeRegister ? (
              <p>RC {client.professionalProfile.tradeRegister}</p>
            ) : null}
            {client.professionalProfile?.sector ? (
              <p>Secteur : {client.professionalProfile.sector}</p>
            ) : null}
            {client.professionalProfile?.rejectionReason ? (
              <p>Motif de refus : {client.professionalProfile.rejectionReason}</p>
            ) : null}
          </section>

          {docs.length > 0 ? (
            <section className="ad-card">
              <h2>Documents</h2>
              <div className="ad-order-links">
                {docs.map((url, i) => {
                  const href = mediaUrl(url) ?? url;
                  return (
                    <a
                      key={`${url}-${i}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={13} /> Pièce {i + 1}
                    </a>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="ad-card">
            <h2>Adresses ({client.addresses?.length ?? 0})</h2>
            {client.addresses?.length ? (
              <ul className="ad-list">
                {client.addresses.map((address) => (
                  <li key={address.id} className="ad-item">
                    <div className="ad-item__top">
                      <strong>
                        {statusLabel(address.type)}
                        {address.label ? ` · ${address.label}` : ''}
                      </strong>
                      {address.isDefault ? (
                        <span className="ad-badge ad-badge--ok">Par défaut</span>
                      ) : null}
                    </div>
                    <p className="ad-item__meta">{formatAddressLine(address)}</p>
                    {address.phone ? (
                      <p className="ad-item__meta">{address.phone}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ad-muted">Aucune adresse enregistrée.</p>
            )}
          </section>

          <section className="ad-card">
            <div className="ad-card__head">
              <h2>Commandes ({client._count?.orders ?? 0})</h2>
              {(client._count?.orders ?? 0) > 0 ? (
                <Link href="/admin/commandes" className="ad-card__link">
                  Voir toutes
                </Link>
              ) : null}
            </div>
            {client.orders?.length ? (
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Statut</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {client.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/commandes/${order.id}`}>
                          {order.number}
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`ad-badge ad-badge--${toneForStatus(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td>{formatPrice(order.total, order.currency)}</td>
                      <td>{formatAdminDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="ad-muted">Aucune commande.</p>
            )}
          </section>

          <section className="ad-card">
            <h2>Devis ({client._count?.quotes ?? 0})</h2>
            {client.quotes?.length ? (
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Statut</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {client.quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td>
                        <Link href={`/admin/devis/${quote.id}`}>
                          {quote.number}
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`ad-badge ad-badge--${toneForStatus(quote.status)}`}
                        >
                          {statusLabel(quote.status)}
                        </span>
                      </td>
                      <td>
                        {quote.total != null
                          ? formatPrice(quote.total, quote.currency)
                          : '—'}
                      </td>
                      <td>{formatAdminDate(quote.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="ad-muted">Aucun devis.</p>
            )}
          </section>

          {(client.returns?.length ?? 0) > 0 ? (
            <section className="ad-card">
              <h2>Retours ({client._count?.returns ?? 0})</h2>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Commande</th>
                    <th>Motif</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {client.returns?.map((ret) => (
                    <tr key={ret.id}>
                      <td>
                        {ret.order ? (
                          <Link href={`/admin/commandes/${ret.order.id}`}>
                            {ret.number}
                          </Link>
                        ) : (
                          ret.number
                        )}
                      </td>
                      <td>
                        {ret.order ? (
                          <Link href={`/admin/commandes/${ret.order.id}`}>
                            {ret.order.number}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{statusLabel(ret.reason)}</td>
                      <td>
                        <span
                          className={`ad-badge ad-badge--${toneForStatus(ret.status)}`}
                        >
                          {statusLabel(ret.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>

        <div>
          <section className="ad-card">
            <h2>Activité</h2>
            <ul className="ad-totals">
              <li>
                <span>CA (hors annulées)</span>
                <strong>{formatPrice(client.spentTotal, 'MAD')}</strong>
              </li>
              <li>
                <span>Commandes</span>
                <strong>{client._count?.orders ?? 0}</strong>
              </li>
              <li>
                <span>Devis</span>
                <strong>{client._count?.quotes ?? 0}</strong>
              </li>
              <li>
                <span>Adresses</span>
                <strong>{client._count?.addresses ?? 0}</strong>
              </li>
            </ul>
          </section>

          {pendingPro ? (
            <section className="ad-card">
              <h2>Validation pro</h2>
              <p>Ce compte professionnel attend une décision.</p>
              <label className="ad-field" style={{ margin: '0.75rem 0' }}>
                <span>Motif de refus</span>
                <textarea
                  className="ad-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Obligatoire en cas de refus"
                />
              </label>
              <div className="ad-actions">
                <button
                  type="button"
                  className="ad-btn ad-btn--green ad-btn--sm"
                  disabled={busy}
                  onClick={() => void review('APPROVED')}
                >
                  Valider
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn--danger ad-btn--sm"
                  disabled={busy}
                  onClick={() => void review('REJECTED')}
                >
                  Refuser
                </button>
              </div>
            </section>
          ) : null}

          {canBlock ? (
            <section className="ad-card">
              <h2>Accès</h2>
              <p>
                {client.status === 'BLOCKED'
                  ? 'Ce compte est bloqué et ne peut plus se connecter.'
                  : 'Bloquer empêche la connexion et les commandes.'}
              </p>
              <button
                type="button"
                className={`ad-btn ad-btn--sm ${
                  client.status === 'BLOCKED' ? 'ad-btn--green' : 'ad-btn--danger'
                }`}
                style={{ marginTop: '0.75rem' }}
                disabled={busy}
                onClick={() => void toggleBlock()}
              >
                {client.status === 'BLOCKED' ? 'Débloquer' : 'Bloquer le compte'}
              </button>
            </section>
          ) : null}

          <section className="ad-card">
            <h2>Modifier la fiche</h2>
            <div className="ad-form">
              <label className="ad-field">
                <span>Téléphone</span>
                <input
                  className="ad-input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </label>
              <label className="ad-field">
                <span>Langue</span>
                <select
                  className="ad-select"
                  value={form.locale}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, locale: e.target.value }))
                  }
                >
                  <option value="FR">Français</option>
                  <option value="EN">English</option>
                </select>
              </label>
              {client.role === 'CUSTOMER_INDIVIDUAL' ? (
                <>
                  <label className="ad-field">
                    <span>Prénom</span>
                    <input
                      className="ad-input"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="ad-field">
                    <span>Nom</span>
                    <input
                      className="ad-input"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              ) : null}
              {client.role === 'CUSTOMER_PRO' ? (
                <>
                  <label className="ad-field">
                    <span>Société</span>
                    <input
                      className="ad-input"
                      value={form.companyName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="ad-field">
                    <span>Contact</span>
                    <input
                      className="ad-input"
                      value={form.contactPerson}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          contactPerson: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="ad-field">
                    <span>ICE</span>
                    <input
                      className="ad-input"
                      value={form.ice}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, ice: e.target.value }))
                      }
                    />
                  </label>
                  <label className="ad-field">
                    <span>IF / Tax ID</span>
                    <input
                      className="ad-input"
                      value={form.taxId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, taxId: e.target.value }))
                      }
                    />
                  </label>
                  <label className="ad-field">
                    <span>Registre de commerce</span>
                    <input
                      className="ad-input"
                      value={form.tradeRegister}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tradeRegister: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="ad-field">
                    <span>Secteur</span>
                    <input
                      className="ad-input"
                      value={form.sector}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sector: e.target.value }))
                      }
                    />
                  </label>
                  <label className="ad-field">
                    <span>Adresse de facturation</span>
                    <textarea
                      className="ad-textarea"
                      value={form.billingAddress}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          billingAddress: e.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              ) : null}
              <button
                type="button"
                className="ad-btn"
                disabled={busy}
                onClick={() => void saveProfile()}
              >
                Enregistrer
              </button>
            </div>
          </section>
        </div>
      </div>
      {dialog}
    </div>
  );
}
