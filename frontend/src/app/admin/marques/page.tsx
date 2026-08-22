'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  api,
  asList,
  mediaUrl,
  uploadProductImages,
  type Brand,
} from '@/lib/api';
import { useAdminConfirm } from '../AdminConfirm';

type BrandForm = {
  name: string;
  slugFr: string;
  slugEn: string;
  descriptionFr: string;
  descriptionEn: string;
  logoUrl: string;
  bannerUrl: string;
  catalogPdfUrl: string;
  seoTitleFr: string;
  seoTitleEn: string;
  seoDescriptionFr: string;
  seoDescriptionEn: string;
  isActive: boolean;
};

const EMPTY: BrandForm = {
  name: '',
  slugFr: '',
  slugEn: '',
  descriptionFr: '',
  descriptionEn: '',
  logoUrl: '',
  bannerUrl: '',
  catalogPdfUrl: '',
  seoTitleFr: '',
  seoTitleEn: '',
  seoDescriptionFr: '',
  seoDescriptionEn: '',
  isActive: true,
};

function fromBrand(brand: Brand): BrandForm {
  return {
    name: brand.name ?? '',
    slugFr: brand.slugFr ?? '',
    slugEn: brand.slugEn ?? '',
    descriptionFr: brand.descriptionFr ?? '',
    descriptionEn: brand.descriptionEn ?? '',
    logoUrl: brand.logoUrl ?? '',
    bannerUrl: brand.bannerUrl ?? '',
    catalogPdfUrl: brand.catalogPdfUrl ?? '',
    seoTitleFr: brand.seoTitleFr ?? '',
    seoTitleEn: brand.seoTitleEn ?? '',
    seoDescriptionFr: brand.seoDescriptionFr ?? '',
    seoDescriptionEn: brand.seoDescriptionEn ?? '',
    isActive: brand.isActive !== false,
  };
}

function payload(form: BrandForm) {
  return {
    name: form.name.trim(),
    slugFr: form.slugFr.trim() || undefined,
    slugEn: form.slugEn.trim() || undefined,
    descriptionFr: form.descriptionFr.trim() || undefined,
    descriptionEn: form.descriptionEn.trim() || undefined,
    logoUrl: form.logoUrl.trim() || undefined,
    bannerUrl: form.bannerUrl.trim() || undefined,
    catalogPdfUrl: form.catalogPdfUrl.trim() || undefined,
    seoTitleFr: form.seoTitleFr.trim() || undefined,
    seoTitleEn: form.seoTitleEn.trim() || undefined,
    seoDescriptionFr: form.seoDescriptionFr.trim() || undefined,
    seoDescriptionEn: form.seoDescriptionEn.trim() || undefined,
    isActive: form.isActive,
  };
}

export default function AdminMarquesPage() {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY);
  const [panelOpen, setPanelOpen] = useState(false);
  const { confirm, dialog } = useAdminConfirm();

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 2800);
  }

  function load() {
    setLoading(true);
    api<Brand[]>('/admin/brands')
      .then((list) => {
        setBrands(asList(list));
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Erreur marques'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return brands.filter((brand) => {
      if (filter === 'active' && brand.isActive === false) return false;
      if (filter === 'inactive' && brand.isActive !== false) return false;
      if (!query) return true;
      const hay = [
        brand.name,
        brand.slugFr,
        brand.slugEn,
        brand.descriptionFr,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [brands, q, filter]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setPanelOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingId(brand.id);
    setForm(fromBrand(brand));
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save() {
    if (form.name.trim().length < 2) {
      setError('Le nom de la marque est requis (2 caractères min.).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api(`/admin/brands/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload(form)),
        });
        flash('Marque mise à jour.');
      } else {
        await api('/admin/brands', {
          method: 'POST',
          body: JSON.stringify(payload(form)),
        });
        flash('Marque créée.');
      }
      closePanel();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(brand: Brand) {
    setSaving(true);
    try {
      await api(`/admin/brands/${brand.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: brand.isActive === false }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  }

  async function remove(brand: Brand) {
    const ok = await confirm({
      title: 'Supprimer cette marque ?',
      description: `« ${brand.name} » sera retirée définitivement.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api(`/admin/brands/${brand.id}`, { method: 'DELETE' });
      if (editingId === brand.id) closePanel();
      flash('Marque supprimée.');
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Suppression impossible';
      setError(
        /products|produits/i.test(msg)
          ? 'Cette marque a des produits. Désactivez-la plutôt.'
          : msg,
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadField(kind: 'logo' | 'banner', file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    setError(null);
    try {
      const uploaded = await uploadProductImages([file]);
      const url = uploaded[0]?.url;
      if (!url) throw new Error('Upload échoué');
      setForm((prev) => ({
        ...prev,
        [kind === 'logo' ? 'logoUrl' : 'bannerUrl']: url,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload impossible');
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      {dialog}
      <div className="ad-page-head">
        <div>
          <h1>Marques</h1>
          <p>
            {brands.length} marque{brands.length > 1 ? 's' : ''} · logos,
            fiches et liaison catalogue.
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
            <Plus size={14} /> Nouvelle marque
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}
      {success ? <p className="ad-success">{success}</p> : null}

      <div className="ad-chips">
        {(
          [
            ['all', 'Toutes'],
            ['active', 'Actives'],
            ['inactive', 'Inactives'],
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
          placeholder="Rechercher nom, slug…"
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
              <th>Marque</th>
              <th>Slug</th>
              <th>Produits</th>
              <th>Statut</th>
              <th style={{ width: '1%' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((brand) => (
              <tr
                key={brand.id}
                className="ad-row-click"
                onClick={() => openEdit(brand)}
              >
                <td>
                  <span className="ad-prod-cell">
                    {brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="ad-prod-photo"
                        src={mediaUrl(brand.logoUrl) ?? brand.logoUrl}
                        alt=""
                      />
                    ) : (
                      <span className="ad-prod-photo ad-prod-photo--empty" />
                    )}
                    <span>
                      <strong>{brand.name}</strong>
                    </span>
                  </span>
                </td>
                <td className="ad-muted">{brand.slugFr}</td>
                <td>{brand._count?.products ?? 0}</td>
                <td>
                  <span
                    className={`ad-badge ${brand.isActive === false ? 'ad-badge--mute' : 'ad-badge--ok'}`}
                  >
                    {brand.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="ad-actions">
                    <button
                      type="button"
                      className="ad-icon-btn"
                      title="Modifier"
                      aria-label="Modifier"
                      onClick={() => openEdit(brand)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="ad-icon-btn"
                      title={
                        brand.isActive === false ? 'Activer' : 'Désactiver'
                      }
                      aria-label={
                        brand.isActive === false ? 'Activer' : 'Désactiver'
                      }
                      disabled={saving}
                      onClick={() => void toggle(brand)}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      type="button"
                      className="ad-icon-btn is-danger"
                      title="Supprimer"
                      aria-label="Supprimer"
                      disabled={saving}
                      onClick={() => void remove(brand)}
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
            Aucune marque.
          </p>
        ) : null}
      </div>

      {panelOpen ? (
        <div className="ad-card" style={{ marginTop: '0.85rem' }}>
          <div className="ad-card__head">
            <h2>{editingId ? 'Modifier la marque' : 'Nouvelle marque'}</h2>
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
              <span>Nom *</span>
              <input
                className="ad-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="ad-field">
              <span>Active</span>
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
              <span>Slug FR</span>
              <input
                className="ad-input"
                value={form.slugFr}
                placeholder="auto si vide"
                onChange={(e) => setForm({ ...form, slugFr: e.target.value })}
              />
            </label>
            <label className="ad-field">
              <span>Slug EN</span>
              <input
                className="ad-input"
                value={form.slugEn}
                placeholder="auto si vide"
                onChange={(e) => setForm({ ...form, slugEn: e.target.value })}
              />
            </label>
            <label className="ad-field" style={{ gridColumn: '1 / -1' }}>
              <span>Description FR</span>
              <textarea
                className="ad-textarea"
                rows={3}
                value={form.descriptionFr}
                onChange={(e) =>
                  setForm({ ...form, descriptionFr: e.target.value })
                }
              />
            </label>
            <label className="ad-field" style={{ gridColumn: '1 / -1' }}>
              <span>Description EN</span>
              <textarea
                className="ad-textarea"
                rows={2}
                value={form.descriptionEn}
                onChange={(e) =>
                  setForm({ ...form, descriptionEn: e.target.value })
                }
              />
            </label>
          </div>

          <div className="ad-form ad-form--2" style={{ marginTop: '0.75rem' }}>
            <div className="ad-field">
              <span>Logo</span>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void uploadField('logo', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="ad-actions" style={{ marginTop: '0.35rem' }}>
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={uploading === 'logo'}
                  onClick={() => logoRef.current?.click()}
                >
                  <Upload size={13} />
                  {uploading === 'logo' ? 'Envoi…' : 'Uploader'}
                </button>
                {form.logoUrl ? (
                  <button
                    type="button"
                    className="ad-icon-btn is-danger"
                    title="Retirer"
                    onClick={() => setForm({ ...form, logoUrl: '' })}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(form.logoUrl) ?? form.logoUrl}
                  alt=""
                  style={{
                    marginTop: '0.5rem',
                    width: '3.5rem',
                    height: '3.5rem',
                    objectFit: 'contain',
                    borderRadius: 8,
                    border: '1px solid var(--ad-line)',
                  }}
                />
              ) : null}
              <input
                className="ad-input"
                style={{ marginTop: '0.45rem' }}
                value={form.logoUrl}
                placeholder="URL logo"
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              />
            </div>
            <div className="ad-field">
              <span>Bannière</span>
              <input
                ref={bannerRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void uploadField('banner', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="ad-actions" style={{ marginTop: '0.35rem' }}>
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={uploading === 'banner'}
                  onClick={() => bannerRef.current?.click()}
                >
                  <Upload size={13} />
                  {uploading === 'banner' ? 'Envoi…' : 'Uploader'}
                </button>
                {form.bannerUrl ? (
                  <button
                    type="button"
                    className="ad-icon-btn is-danger"
                    title="Retirer"
                    onClick={() => setForm({ ...form, bannerUrl: '' })}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
              {form.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(form.bannerUrl) ?? form.bannerUrl}
                  alt=""
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    maxWidth: '12rem',
                    height: '3.5rem',
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid var(--ad-line)',
                  }}
                />
              ) : null}
              <input
                className="ad-input"
                style={{ marginTop: '0.45rem' }}
                value={form.bannerUrl}
                placeholder="URL bannière"
                onChange={(e) =>
                  setForm({ ...form, bannerUrl: e.target.value })
                }
              />
            </div>
            <label className="ad-field" style={{ gridColumn: '1 / -1' }}>
              <span>Catalogue PDF (URL)</span>
              <input
                className="ad-input"
                value={form.catalogPdfUrl}
                onChange={(e) =>
                  setForm({ ...form, catalogPdfUrl: e.target.value })
                }
              />
            </label>
            <label className="ad-field">
              <span>SEO titre FR</span>
              <input
                className="ad-input"
                value={form.seoTitleFr}
                onChange={(e) =>
                  setForm({ ...form, seoTitleFr: e.target.value })
                }
              />
            </label>
            <label className="ad-field">
              <span>SEO titre EN</span>
              <input
                className="ad-input"
                value={form.seoTitleEn}
                onChange={(e) =>
                  setForm({ ...form, seoTitleEn: e.target.value })
                }
              />
            </label>
            <label className="ad-field">
              <span>SEO description FR</span>
              <textarea
                className="ad-textarea"
                rows={2}
                value={form.seoDescriptionFr}
                onChange={(e) =>
                  setForm({ ...form, seoDescriptionFr: e.target.value })
                }
              />
            </label>
            <label className="ad-field">
              <span>SEO description EN</span>
              <textarea
                className="ad-textarea"
                rows={2}
                value={form.seoDescriptionEn}
                onChange={(e) =>
                  setForm({ ...form, seoDescriptionEn: e.target.value })
                }
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
