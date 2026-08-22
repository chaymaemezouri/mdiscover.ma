'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../admin-utils';
import { useAdminConfirm } from '../AdminConfirm';

type ContactStatus = 'NEW' | 'READ' | 'ARCHIVED';

type ContactMessage = {
  id: string;
  topic: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  message: string;
  status: ContactStatus;
  createdAt: string;
};

type FilterId = 'all' | 'NEW' | 'READ' | 'ARCHIVED';

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'NEW', label: 'Nouveaux' },
  { id: 'READ', label: 'Lus' },
  { id: 'ARCHIVED', label: 'Archivés' },
];

const STATUS_LABEL: Record<ContactStatus, string> = {
  NEW: 'Nouveau',
  READ: 'Lu',
  ARCHIVED: 'Archivé',
};

export default function AdminContactPage() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState<FilterId>('NEW');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, dialog } = useAdminConfirm();

  function load() {
    setLoading(true);
    api<ContactMessage[]>('/contact/admin')
      .then((list) => {
        setItems(Array.isArray(list) ? list : []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erreur messages');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!query) return true;
      const hay = [
        item.topic,
        item.name,
        item.email,
        item.company,
        item.phone,
        item.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [items, filter, q]);

  const newCount = items.filter((i) => i.status === 'NEW').length;

  async function openMessage(item: ContactMessage) {
    setSelected(item);
    if (item.status !== 'NEW') return;
    setBusyId(item.id);
    try {
      const updated = await api<ContactMessage>(
        `/contact/admin/${item.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'READ' }),
        },
      );
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
      setSelected(updated);
    } catch {
      /* keep selected */
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(id: string, status: ContactStatus) {
    setBusyId(id);
    try {
      const updated = await api<ContactMessage>(`/contact/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.map((row) => (row.id === id ? updated : row)));
      setSelected((prev) => (prev?.id === id ? updated : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Supprimer ce message ?',
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    setBusyId(id);
    try {
      await api(`/contact/admin/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((row) => row.id !== id));
      setSelected((prev) => (prev?.id === id ? null : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ad-page">
      {dialog}
      <div className="ad-toolbar">
        <div>
          <h1 className="ad-title">Messages contact</h1>
          <p className="ad-sub">
            {newCount > 0
              ? `${newCount} nouveau${newCount > 1 ? 'x' : ''} · aussi reçus par email`
              : 'Messages du formulaire Contact du site'}
          </p>
        </div>
        <div className="ad-actions">
          <button type="button" className="ad-btn ad-btn--ghost" onClick={load}>
            <RefreshCw size={15} aria-hidden /> Actualiser
          </button>
        </div>
      </div>

      <div className="ad-toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="ad-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ad-tab${filter === f.id ? ' is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === 'NEW' && newCount > 0 ? ` (${newCount})` : ''}
            </button>
          ))}
        </div>
        <label className="ad-search-wrap">
          <Search size={15} aria-hidden />
          <input
            className="ad-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher nom, email, sujet…"
          />
          {q ? (
            <button
              type="button"
              className="ad-search-clear"
              aria-label="Effacer"
              onClick={() => setQ('')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      <div className="ad-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Chargement…
          </p>
        ) : filtered.length === 0 ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Aucun message.
          </p>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Sujet</th>
                <th>Contact</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => void openMessage(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span
                      className={`ad-badge ad-badge--${toneForStatus(item.status)}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td>
                    <strong>{item.topic}</strong>
                  </td>
                  <td>
                    <div>{item.name}</div>
                    <div className="ad-muted">{item.email}</div>
                  </td>
                  <td className="ad-muted">{formatAdminDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected ? (
        <div className="ad-card" style={{ marginTop: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              alignItems: 'flex-start',
              marginBottom: '1rem',
            }}
          >
            <div>
              <p className="ad-muted" style={{ margin: 0 }}>
                {selected.topic}
              </p>
              <h2 style={{ margin: '0.25rem 0' }}>{selected.name}</h2>
              <p className="ad-muted" style={{ margin: 0 }}>
                {formatAdminDate(selected.createdAt)}
              </p>
            </div>
            <span
              className={`ad-badge ad-badge--${toneForStatus(selected.status)}`}
            >
              {STATUS_LABEL[selected.status]}
            </span>
          </div>

          <div className="ad-detail__grid">
            <div>
              <span>Email</span>
              <a href={`mailto:${selected.email}`}>{selected.email}</a>
            </div>
            {selected.phone ? (
              <div>
                <span>Téléphone</span>
                <a href={`tel:${selected.phone}`}>{selected.phone}</a>
              </div>
            ) : null}
            {selected.company ? (
              <div>
                <span>Entreprise</span>
                <strong>{selected.company}</strong>
              </div>
            ) : null}
          </div>

          <div className="ad-item" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
              {selected.message}
            </p>
          </div>

          <div className="ad-actions" style={{ flexWrap: 'wrap' }}>
            {selected.status !== 'ARCHIVED' ? (
              <button
                type="button"
                className="ad-btn ad-btn--ghost"
                disabled={busyId === selected.id}
                onClick={() => void setStatus(selected.id, 'ARCHIVED')}
              >
                Archiver
              </button>
            ) : (
              <button
                type="button"
                className="ad-btn ad-btn--ghost"
                disabled={busyId === selected.id}
                onClick={() => void setStatus(selected.id, 'READ')}
              >
                Désarchiver
              </button>
            )}
            <a className="ad-btn" href={`mailto:${selected.email}`}>
              Répondre par email
            </a>
            <button
              type="button"
              className="ad-btn ad-btn--danger"
              disabled={busyId === selected.id}
              onClick={() => void remove(selected.id)}
            >
              <Trash2 size={14} aria-hidden /> Supprimer
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--ghost"
              onClick={() => setSelected(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
