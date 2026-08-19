'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, X } from 'lucide-react';
import {
  api,
  apiDownload,
  asList,
  statusLabel,
  type AdminClient,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../admin-utils';
import {
  CLIENT_FILTERS,
  clientDisplayName,
  clientInitials,
  type ClientFilterId,
} from './client-helpers';

export default function AdminClientsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminClient[]>([]);
  const [filter, setFilter] = useState<ClientFilterId>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api<AdminClient[] | { items: AdminClient[] }>('/admin/users')
      .then((list) => {
        setUsers(asList(list));
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur clients'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === 'CUSTOMER_PRO' &&
          u.professionalProfile?.validationStatus === 'PENDING',
      ),
    [users],
  );

  const filtered = useMemo(() => {
    const active = CLIENT_FILTERS.find((f) => f.id === filter) ?? CLIENT_FILTERS[0];
    const query = q.trim().toLowerCase();
    return users.filter((u) => {
      if (!active.match(u)) return false;
      if (!query) return true;
      const hay = [
        u.email,
        u.phone,
        clientDisplayName(u),
        u.individualProfile?.firstName,
        u.individualProfile?.lastName,
        u.professionalProfile?.companyName,
        u.professionalProfile?.contactPerson,
        u.professionalProfile?.ice,
        u.professionalProfile?.taxId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [users, filter, q]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        CLIENT_FILTERS.map((f) => [
          f.id,
          users.filter((u) => f.match(u)).length,
        ]),
      ) as Record<ClientFilterId, number>,
    [users],
  );

  async function review(userId: string, decision: 'APPROVED' | 'REJECTED') {
    let rejectionReason: string | undefined;
    if (decision === 'REJECTED') {
      const reason = window.prompt('Motif du refus (obligatoire) :')?.trim();
      if (!reason) return;
      rejectionReason = reason;
    }
    setBusyId(userId);
    try {
      await api(`/admin/users/${userId}/professional/review`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, rejectionReason }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation impossible');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>Clients</h1>
          <p>
            {users.length} compte{users.length > 1 ? 's' : ''} · fiches,
            validation pro et historique.
          </p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            disabled={loading}
            onClick={() => load()}
          >
            <RefreshCw size={13} aria-hidden /> Actualiser
          </button>
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            onClick={() =>
              void apiDownload('/admin/export/customers', 'clients.csv')
            }
          >
            <Download size={13} aria-hidden /> Export CSV
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      {pending.length > 0 && filter !== 'pending' ? (
        <section className="ad-alert">
          <strong>
            {pending.length} compte{pending.length > 1 ? 's' : ''} professionnel
            {pending.length > 1 ? 's' : ''} en attente de validation.
          </strong>
          <div className="ad-list" style={{ marginTop: '0.7rem' }}>
            {pending.slice(0, 4).map((u) => (
              <article key={u.id} className="ad-item">
                <div className="ad-item__top">
                  <div>
                    <strong>{clientDisplayName(u)}</strong>
                    <p className="ad-item__meta">
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ''}
                      {u.professionalProfile?.ice
                        ? ` · ICE ${u.professionalProfile.ice}`
                        : ''}
                    </p>
                  </div>
                  <span className="ad-badge ad-badge--info">En attente</span>
                </div>
                <div className="ad-item__actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                    onClick={() => router.push(`/admin/clients/${u.id}`)}
                  >
                    Ouvrir
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn--green ad-btn--sm"
                    disabled={busyId === u.id}
                    onClick={() => void review(u.id, 'APPROVED')}
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn--danger ad-btn--sm"
                    disabled={busyId === u.id}
                    onClick={() => void review(u.id, 'REJECTED')}
                  >
                    Refuser
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="ad-chips">
        {CLIENT_FILTERS.map((f) => (
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

      <label className="ad-search-wrap">
        <Search size={18} strokeWidth={1.8} aria-hidden />
        <input
          className="ad-search"
          placeholder="Rechercher email, société, téléphone, ICE…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q ? (
          <button
            type="button"
            className="ad-search-clear"
            aria-label="Effacer la recherche"
            onClick={() => setQ('')}
          >
            <X size={12} />
          </button>
        ) : null}
      </label>
      {q.trim() ? (
        <p className="ad-search-meta">
          {filtered.length} client{filtered.length > 1 ? 's' : ''} trouvé
          {filtered.length > 1 ? 's' : ''}
        </p>
      ) : null}

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Téléphone</th>
              <th>Type</th>
              <th>Commandes</th>
              <th>Dernière activité</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const pendingPro =
                u.role === 'CUSTOMER_PRO' &&
                u.professionalProfile?.validationStatus === 'PENDING';
              return (
                <tr
                  key={u.id}
                  className="ad-row-click"
                  onClick={() => router.push(`/admin/clients/${u.id}`)}
                >
                  <td>
                    <span className="ad-prod-cell">
                      <span className="ad-client-mark" aria-hidden>
                        {clientInitials(u)}
                      </span>
                      <span>
                        <strong>{clientDisplayName(u)}</strong>
                        <span className="ad-muted"> · {u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>{u.phone || '—'}</td>
                  <td>{statusLabel(u.role)}</td>
                  <td>
                    {u._count?.orders ?? 0}
                    {u._count?.quotes ? (
                      <span className="ad-muted">
                        {' '}
                        · {u._count.quotes} devis
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {u.lastOrderAt
                      ? formatAdminDate(u.lastOrderAt)
                      : formatAdminDate(u.lastLoginAt ?? u.createdAt)}
                    {u.lastOrderNumber ? (
                      <div className="ad-muted">{u.lastOrderNumber}</div>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={`ad-badge ad-badge--${toneForStatus(
                        pendingPro ? 'PENDING' : u.status,
                      )}`}
                    >
                      {pendingPro
                        ? 'En attente'
                        : statusLabel(u.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Chargement…
          </p>
        ) : filtered.length === 0 ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Aucun client sur ce filtre.
          </p>
        ) : null}
      </div>
    </div>
  );
}
