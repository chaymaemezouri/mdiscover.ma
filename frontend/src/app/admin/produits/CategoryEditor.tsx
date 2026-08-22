'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, ImagePlus, Trash2 } from 'lucide-react';
import { api, asList, mediaUrl, uploadProductImages } from '@/lib/api';
import { useAdminConfirm } from '../AdminConfirm';

type CategoryRecord = {
  id: string;
  nameFr: string;
  nameEn?: string;
  slugFr?: string;
  slugEn?: string;
  parentId?: string | null;
  parent?: { id: string; nameFr: string } | null;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  seoTitleFr?: string | null;
  seoDescriptionFr?: string | null;
  isActive?: boolean;
  featuredOnHome?: boolean;
  sortOrder?: number;
  children?: Array<{
    id: string;
    nameFr: string;
    slugFr?: string;
    isActive?: boolean;
  }>;
  products?: Array<{
    id: string;
    sku: string;
    nameFr: string;
    isActive?: boolean;
    stockQty?: number;
  }>;
  _count?: { products?: number; children?: number };
};

const EMPTY = {
  nameFr: '',
  nameEn: '',
  parentId: '',
  descriptionFr: '',
  descriptionEn: '',
  imageUrl: '',
  seoTitleFr: '',
  seoDescriptionFr: '',
  sortOrder: '0',
  isActive: true,
  featuredOnHome: false,
};

export function CategoryEditor({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const editing = Boolean(categoryId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [category, setCategory] = useState<CategoryRecord | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useAdminConfirm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function hydrate(cat: CategoryRecord) {
    setCategory(cat);
    setForm({
      nameFr: cat.nameFr ?? '',
      nameEn: cat.nameEn ?? '',
      parentId: cat.parentId ?? cat.parent?.id ?? '',
      descriptionFr: cat.descriptionFr ?? '',
      descriptionEn: cat.descriptionEn ?? '',
      imageUrl: cat.imageUrl ?? '',
      seoTitleFr: cat.seoTitleFr ?? '',
      seoDescriptionFr: cat.seoDescriptionFr ?? '',
      sortOrder: String(cat.sortOrder ?? 0),
      isActive: cat.isActive !== false,
      featuredOnHome: cat.featuredOnHome === true,
    });
  }

  function loadLists() {
    api<CategoryRecord[]>('/admin/categories')
      .then((list) => setCategories(asList(list)))
      .catch(() => setCategories([]));
  }

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    api<CategoryRecord>(`/admin/categories/${categoryId}`)
      .then((cat) => {
        hydrate(cat);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Catégorie introuvable'),
      )
      .finally(() => setLoading(false));
  }, [categoryId]);

  async function addImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadProductImages([file]);
      const url = uploaded[0]?.url;
      if (!url) throw new Error('Upload incomplet');
      setForm((prev) => ({ ...prev, imageUrl: url }));
      flash('Image ajoutée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload impossible');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!form.nameFr.trim() || form.nameFr.trim().length < 2) {
      setError('Le nom de la catégorie est requis.');
      return;
    }
    const isRoot = !form.parentId;
    if (isRoot && form.featuredOnHome && !form.imageUrl.trim()) {
      setError(
        'Ajoutez une image pour afficher cette catégorie dans « Explorez nos univers ».',
      );
      return;
    }
    const nameFr = form.nameFr.trim();
    const payload = {
      nameFr,
      parentId: form.parentId || (editing ? null : undefined),
      descriptionFr: form.descriptionFr.trim() || undefined,
      imageUrl: form.imageUrl.trim() || (editing ? null : undefined),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
      featuredOnHome: isRoot ? form.featuredOnHome : false,
    };
    setSaving(true);
    setError(null);
    try {
      if (editing && categoryId) {
        const next = await api<CategoryRecord>(
          `/admin/categories/${categoryId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        );
        hydrate(next);
        flash('Catégorie enregistrée.');
      } else {
        await api('/admin/categories', {
          method: 'POST',
          body: JSON.stringify({ ...payload, isActive: true }),
        });
        router.push('/admin/produits?tab=categories');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!categoryId || !category) return;
    const ok = await confirm({
      title: 'Supprimer cette catégorie ?',
      description: `« ${category.nameFr} » sera retirée de l’arborescence. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/admin/categories/${categoryId}`, { method: 'DELETE' });
      router.push('/admin/produits?tab=categories');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.includes('subcategories')
            ? 'Cette catégorie a des sous-catégories. Désactivez-la plutôt.'
            : e.message.includes('products')
              ? 'Cette catégorie a des produits. Désactivez-la plutôt.'
              : e.message
          : 'Suppression impossible',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="ad-loading">Chargement de la catégorie…</p>;
  if (editing && !category) {
    return (
      <div>
        <p className="ad-error">{error ?? 'Catégorie introuvable.'}</p>
        <Link href="/admin/produits?tab=categories" className="ad-btn ad-btn--ghost">
          Retour aux catégories
        </Link>
      </div>
    );
  }

  const productCount = category?._count?.products ?? category?.products?.length ?? 0;
  const childCount = category?._count?.children ?? category?.children?.length ?? 0;

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <Link href="/admin/produits?tab=categories" className="ad-back">
            <ArrowLeft size={14} /> Toutes les catégories
          </Link>
          <h1>{editing ? category?.nameFr : 'Nouvelle catégorie'}</h1>
          <p>
            {editing
              ? `${productCount} produit${productCount > 1 ? 's' : ''} · ${childCount} sous-catégorie${childCount > 1 ? 's' : ''}`
              : 'Nom, visuel et parent. Slug et SEO sont générés automatiquement.'}
          </p>
        </div>
        <div className="ad-actions">
          {category?.slugFr ? (
            <Link
              href={`/categories/${category.slugFr}`}
              className="ad-btn ad-btn--ghost ad-btn--sm"
              target="_blank"
            >
              <ExternalLink size={13} /> Voir en boutique
            </Link>
          ) : null}
          <button
            type="button"
            className="ad-btn"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}
      {success ? <p className="ad-success">{success}</p> : null}

      <div className="ad-quote-page">
        <div>
          <section className="ad-card">
            <h2>Identité</h2>
            <div className="ad-form">
              <label className="ad-field">
                <span>Nom *</span>
                <input
                  className="ad-input"
                  value={form.nameFr}
                  onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
                />
              </label>
              <label className="ad-field">
                <span>Catégorie parente</span>
                <select
                  className="ad-select"
                  value={form.parentId}
                  onChange={(e) =>
                    setForm({ ...form, parentId: e.target.value })
                  }
                >
                  <option value="">Aucune (racine)</option>
                  {categories
                    .filter((c) => c.id !== categoryId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameFr}
                      </option>
                    ))}
                </select>
              </label>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>Ordre d’affichage</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({ ...form, sortOrder: e.target.value })
                    }
                  />
                </label>
                {category?.slugFr ? (
                  <label className="ad-field">
                    <span>Slug</span>
                    <input className="ad-input" value={category.slugFr} readOnly />
                  </label>
                ) : null}
              </div>
              <label className="ad-field">
                <span>Description</span>
                <textarea
                  className="ad-textarea"
                  rows={4}
                  value={form.descriptionFr}
                  onChange={(e) =>
                    setForm({ ...form, descriptionFr: e.target.value })
                  }
                />
              </label>
            </div>
          </section>

          {editing && category?.children?.length ? (
            <section className="ad-card">
              <h2>Sous-catégories</h2>
              <ul className="ad-doc-list">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link href={`/admin/produits/categorie/${child.id}`}>
                      {child.nameFr}
                    </Link>
                    {child.isActive === false ? (
                      <span className="ad-muted"> · inactive</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {editing ? (
            <section className="ad-card">
              <h2>Produits ({productCount})</h2>
              {category?.products?.length ? (
                <table className="ad-mini-table">
                  <tbody>
                    {category.products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/admin/produits/${p.id}`}>
                            {p.nameFr}
                          </Link>
                          <span className="ad-muted"> · {p.sku}</span>
                        </td>
                        <td>{p.stockQty ?? 0}</td>
                        <td>
                          <span
                            className={`ad-badge ${p.isActive === false ? 'ad-badge--mute' : 'ad-badge--ok'}`}
                          >
                            {p.isActive === false ? 'Inactif' : 'Actif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="ad-empty">Aucun produit dans cette catégorie.</p>
              )}
            </section>
          ) : null}
        </div>

        <div>
          <section className="ad-card" style={{ marginBottom: '0.85rem' }}>
            <h2>Image</h2>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="ad-uploader__input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void addImage(file);
                e.target.value = '';
              }}
            />
            {form.imageUrl ? (
              <div className="ad-cat-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(form.imageUrl) ?? form.imageUrl} alt="" />
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  onClick={() => setForm({ ...form, imageUrl: '' })}
                >
                  <Trash2 size={13} /> Retirer
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="ad-uploader"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={22} aria-hidden />
                <strong>{uploading ? 'Envoi…' : 'Ajouter une image'}</strong>
                <span>Depuis le téléphone ou l’ordinateur.</span>
              </button>
            )}
          </section>

          <section className="ad-card" style={{ marginBottom: '0.85rem' }}>
            <h2>Visibilité</h2>
            <label className="ad-check">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Catégorie active (visible boutique)
            </label>
            {!form.parentId ? (
              <label className="ad-check" style={{ marginTop: '0.65rem' }}>
                <input
                  type="checkbox"
                  checked={form.featuredOnHome}
                  onChange={(e) =>
                    setForm({ ...form, featuredOnHome: e.target.checked })
                  }
                />
                Afficher dans « Explorez nos univers » (accueil)
              </label>
            ) : (
              <p className="ad-muted" style={{ marginTop: '0.65rem' }}>
                Seules les catégories racines peuvent apparaître dans « Explorez nos univers ».
              </p>
            )}
            {editing ? (
              <button
                type="button"
                className="ad-btn ad-btn--danger ad-btn--sm"
                style={{ marginTop: '0.85rem' }}
                disabled={saving}
                onClick={() => void remove()}
              >
                Supprimer la catégorie
              </button>
            ) : null}
          </section>
        </div>
      </div>
      {dialog}
    </div>
  );
}
