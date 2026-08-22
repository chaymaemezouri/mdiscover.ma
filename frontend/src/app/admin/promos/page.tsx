'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api, asList, formatPrice, type PromoCode } from '@/lib/api';
import { formatAdminDate } from '../admin-utils';
import { useAdminConfirm } from '../AdminConfirm';

type PromoForm = {
  code: string;
  type: PromoCode['type'];
  value: string;
  minOrderAmount: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY: PromoForm = {
  code: '',
  type: 'PERCENT',
  value: '',
  minOrderAmount: '',
  maxUses: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

function toDateInput(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function fromPromo(promo: PromoCode): PromoForm {
  return {
    code: promo.code ?? '',
    type: promo.type,
    value: String(promo.value ?? ''),
    minOrderAmount:
      promo.minOrderAmount != null ? String(promo.minOrderAmount) : '',
    maxUses: promo.maxUses != null ? String(promo.maxUses) : '',
    startsAt: toDateInput(promo.startsAt),
    endsAt: toDateInput(promo.endsAt),
    isActive: promo.isActive !== false,
  };
}

function typeLabel(type: PromoCode['type']) {
  if (type === 'PERCENT') return 'Pourcentage';
  if (type === 'FIXED') return 'Montant fixe';
  return 'Livraison offerte';
}

function valueLabel(promo: PromoCode) {
  if (promo.type === 'PERCENT') return `${promo.value} %`;
  if (promo.type === 'FREE_SHIPPING') return 'Livraison';
  return formatPrice(promo.value);
}

function payload(form: PromoForm) {
  const value = Number(form.value);
  return {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: form.type === 'FREE_SHIPPING' ? 0 : value,
    minOrderAmount: form.minOrderAmount
      ? Number(form.minOrderAmount)
      : null,
    maxUses: form.maxUses ? Number(form.maxUses) : null,
    startsAt: form.startsAt ? `${form.startsAt}T00:00:00.000Z` : null,
    endsAt: form.endsAt ? `${form.endsAt}T23:59:59.000Z` : null,
    isActive: form.isActive,
  };
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoForm>(EMPTY);
  const [panelOpen, setPanelOpen] = useState(false);
  const { confirm, dialog } = useAdminConfirm();

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 2800);
  }

  function load() {
    setLoading(true);
    api<PromoCode[]>('/admin/promos')
      .then((list) => {
        setPromos(asList(list));
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur promos'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return promos.filter((promo) => {
      if (filter === 'active' && promo.isActive === false) return false;
      if (filter === 'inactive' && promo.isActive !== false) return false;
      if (!query) return true;
      return promo.code.toLowerCase().includes(query);
    });
  }, [promos, q, filter]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setPanelOpen(true);
  }

  function openEdit(promo: PromoCode) {
    setEditingId(promo.id);
    setForm(fromPromo(promo));
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save() {
    if (form.code.trim().length < 2) {
      setError('Indiquez un code promo (2 caractères min.).');
      return;
    }
    if (form.type !== 'FREE_SHIPPING') {
      const value = Number(form.value);
      if (!Number.isFinite(value) || value < 0) {
        setError('Valeur invalide.');
        return;
      }
      if (form.type === 'PERCENT' && value > 100) {
        setError('Le pourcentage ne peut pas dépasser 100.');
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const body = payload(form);
      if (editingId) {
        await api(`/admin/promos/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        flash('Code promo mis à jour.');
      } else {
        await api('/admin/promos', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        flash('Code promo créé.');
      }
      closePanel();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(promo: PromoCode) {
    setSaving(true);
    try {
      await api(`/admin/promos/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: promo.isActive === false }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  }

  async function remove(promo: PromoCode) {
    const ok = await confirm({
      title: 'Supprimer ce code promo ?',
      description: `« ${promo.code} » sera retiré définitivement.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api(`/admin/promos/${promo.id}`, { method: 'DELETE' });
      if (editingId === promo.id) closePanel();
      flash('Code promo supprimé.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {dialog}
      <div className="ad-page-head">
        <div>
          <h1>Promos</h1>
          <p>
            {promos.length} code{promos.length > 1 ? 's' : ''} · réductions
            panier (%, montant, livraison).
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
          <button type="button" className="ad-btn ad-btn--sm" onClick={openCreate}>
            <Plus size={14} /> Nouveau code
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}
      {success ? <p className="ad-success">{success}</p> : null}

      <div className="ad-chips">
        {(
          [
            ['all', 'Tous'],
            ['active', 'Actifs'],
            ['inactive', 'Inactifs'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`ad-chip${filter === id ? ' is-active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="ad-search-wrap">
        <Search size={14} aria-hidden />
        <input
          className="ad-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un code…"
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

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Valeur</th>
              <th>Usages</th>
              <th>Période</th>
              <th>Statut</th>
              <th style={{ width: '1%' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((promo) => (
              <tr
                key={promo.id}
                className="ad-row-click"
                onClick={() => openEdit(promo)}
              >
                <td>
                  <strong>{promo.code}</strong>
                </td>
                <td>{typeLabel(promo.type)}</td>
                <td>{valueLabel(promo)}</td>
                <td>
                  {promo.usedCount ?? 0}
                  {promo.maxUses != null ? ` / ${promo.maxUses}` : ''}
                </td>
                <td className="ad-muted">
                  {promo.startsAt || promo.endsAt
                    ? `${promo.startsAt ? formatAdminDate(promo.startsAt) : '…'} → ${promo.endsAt ? formatAdminDate(promo.endsAt) : '…'}`
                    : 'Sans limite'}
                </td>
                <td>
                  <span
                    className={`ad-badge ${promo.isActive === false ? 'ad-badge--mute' : 'ad-badge--ok'}`}
                  >
                    {promo.isActive === false ? 'Inactif' : 'Actif'}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="ad-actions">
                    <button
                      type="button"
                      className="ad-icon-btn"
                      title="Modifier"
                      aria-label="Modifier"
                      onClick={() => openEdit(promo)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="ad-icon-btn"
                      title={
                        promo.isActive === false ? 'Activer' : 'Désactiver'
                      }
                      aria-label={
                        promo.isActive === false ? 'Activer' : 'Désactiver'
                      }
                      disabled={saving}
                      onClick={() => void toggle(promo)}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      type="button"
                      className="ad-icon-btn is-danger"
                      title="Supprimer"
                      aria-label="Supprimer"
                      disabled={saving}
                      onClick={() => void remove(promo)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
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
            Aucun code promo.
          </p>
        ) : null}
      </div>

      {panelOpen ? (
        <div className="ad-card" style={{ marginTop: '0.85rem' }}>
          <div className="ad-card__head">
            <h2>{editingId ? 'Modifier le code' : 'Nouveau code promo'}</h2>
            <button
              type="button"
              className="ad-icon-btn"
              title="Fermer"
              aria-label="Fermer"
              onClick={closePanel}
            >
              <X size={15} />
            </button>
          </div>

          <div className="ad-form ad-form--2">
            <label className="ad-field">
              <span>Code *</span>
              <input
                className="ad-input"
                value={form.code}
                placeholder="EX: BIENVENUE10"
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
              />
            </label>
            <label className="ad-field">
              <span>Type</span>
              <select
                className="ad-select"
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as PromoCode['type'],
                  })
                }
              >
                <option value="PERCENT">Pourcentage (%)</option>
                <option value="FIXED">Montant fixe (MAD)</option>
                <option value="FREE_SHIPPING">Livraison offerte</option>
              </select>
            </label>
            {form.type !== 'FREE_SHIPPING' ? (
              <label className="ad-field">
                <span>{form.type === 'PERCENT' ? 'Valeur %' : 'Valeur MAD'}</span>
                <input
                  className="ad-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </label>
            ) : (
              <label className="ad-field">
                <span>Valeur</span>
                <input className="ad-input" value="0" disabled />
              </label>
            )}
            <label className="ad-field">
              <span>Actif</span>
              <select
                className="ad-select"
                value={form.isActive ? '1' : '0'}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.value === '1' })
                }
              >
                <option value="1">Oui</option>
                <option value="0">Non</option>
              </select>
            </label>
            <label className="ad-field">
              <span>Commande min. (MAD)</span>
              <input
                className="ad-input"
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) =>
                  setForm({ ...form, minOrderAmount: e.target.value })
                }
              />
            </label>
            <label className="ad-field">
              <span>Usages max</span>
              <input
                className="ad-input"
                type="number"
                min={1}
                value={form.maxUses}
                placeholder="Illimité"
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              />
            </label>
            <label className="ad-field">
              <span>Début</span>
              <input
                className="ad-input"
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label className="ad-field">
              <span>Fin</span>
              <input
                className="ad-input"
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
          </div>

          <div className="ad-actions" style={{ marginTop: '0.85rem' }}>
            <button
              type="button"
              className="ad-btn"
              disabled={saving}
              onClick={() => void save()}
            >
              <Check size={14} />
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--ghost"
              onClick={closePanel}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
