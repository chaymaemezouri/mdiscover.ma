'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  api,
  asList,
  mediaUrl,
  uploadProductImages,
  type AdminProductDetail,
} from '@/lib/api';
import { formatAdminDay } from '../admin-utils';

type Category = { id: string; nameFr: string };
type Brand = { id: string; name: string };

type DraftImage = {
  id: string;
  preview: string;
  url?: string;
  name: string;
  size: number;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
  persisted?: boolean;
};

const ACCEPT =
  'image/*,.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp,.svg,.tif,.tiff,.heic,.heif,.avif,.ico';
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 12;

const EMPTY = {
  sku: '',
  nameFr: '',
  nameEn: '',
  categoryId: '',
  brandId: '',
  price: '',
  promoPrice: '',
  stockQty: '0',
  purchaseMode: 'DIRECT' as 'DIRECT' | 'QUOTE' | 'HYBRID',
  hybridThresholdQty: '10',
  packaging: '',
  unitsPerCarton: '',
  weightKg: '',
  volumeMl: '',
  originCountry: 'MA',
  storageConditions: '',
  descriptionFr: '',
  descriptionEn: '',
  ingredients: '',
  allergens: '',
  keywords: '',
  seoTitleFr: '',
  seoDescriptionFr: '',
  isActive: true,
  isFeatured: false,
  isNew: false,
  isPromo: false,
};

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function num(value: string) {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value?: string | number | null) {
  if (value == null || value === '') return '';
  return String(value);
}

export function ProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const editing = Boolean(productId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lotNumber, setLotNumber] = useState('');
  const [lotExpiry, setLotExpiry] = useState('');
  const [lotQty, setLotQty] = useState('1');
  const [stockDelta, setStockDelta] = useState('1');

  const imagesRef = useRef<DraftImage[]>([]);
  imagesRef.current = images;

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function hydrate(next: AdminProductDetail) {
    setProduct(next);
    setForm({
      sku: next.sku ?? '',
      nameFr: next.nameFr ?? '',
      nameEn: next.nameEn ?? '',
      categoryId: next.categoryId || next.category?.id || '',
      brandId: next.brandId || next.brand?.id || '',
      price: str(next.price),
      promoPrice: str(next.promoPrice),
      stockQty: str(next.stockQty || 0),
      purchaseMode: next.purchaseMode ?? 'DIRECT',
      hybridThresholdQty: str(next.hybridThresholdQty ?? 10),
      packaging: next.packaging ?? '',
      unitsPerCarton: str(next.unitsPerCarton),
      weightKg: str(next.weightKg),
      volumeMl: str(next.volumeMl),
      originCountry: next.originCountry ?? 'MA',
      storageConditions: next.storageConditions ?? '',
      descriptionFr: next.descriptionFr ?? '',
      descriptionEn: next.descriptionEn ?? '',
      ingredients: next.ingredients ?? '',
      allergens: next.allergens ?? '',
      keywords: (next.keywords ?? []).join(', '),
      seoTitleFr: next.seoTitleFr ?? '',
      seoDescriptionFr: next.seoDescriptionFr ?? '',
      isActive: next.isActive !== false,
      isFeatured: Boolean(next.isFeatured),
      isNew: Boolean(next.isNew),
      isPromo: next.promoPrice != null && next.promoPrice !== '',
    });
    const nextImages: DraftImage[] = (next.images ?? []).map((img, index) => ({
      id: img.id ?? `img-${index}`,
      preview: mediaUrl(img.url) ?? img.url,
      url: img.url,
      name: img.altFr || `Image ${index + 1}`,
      size: 0,
      status: 'ready',
      persisted: Boolean(img.id),
    }));
    setImages(nextImages);
    const primary =
      nextImages.find((_, i) => next.images?.[i]?.isPrimary) ?? nextImages[0];
    setPrimaryId(primary?.id ?? null);
  }

  useEffect(() => {
    Promise.all([
      api<Category[]>('/admin/categories').catch(() => []),
      api<Brand[]>('/admin/brands').catch(() => []),
    ]).then(([cats, br]) => {
      setCategories(asList(cats));
      setBrands(asList(br));
    });
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api<AdminProductDetail>(`/admin/products/${productId}`)
      .then((data) => {
        hydrate(data);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Produit introuvable'),
      )
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
      });
    };
  }, []);

  function patch<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const room = MAX_FILES - images.length;
    if (room <= 0) {
      setError(`Maximum ${MAX_FILES} images.`);
      return;
    }

    const batch: Array<{ draft: DraftImage; file: File }> = [];
    for (const file of incoming.slice(0, room)) {
      const isImage =
        file.type.startsWith('image/') ||
        /\.(jpe?g|jfif|png|webp|gif|bmp|svg|tiff?|heic|heif|avif|ico)$/i.test(
          file.name,
        );
      if (!isImage) {
        setError(`« ${file.name} » n’est pas une image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`« ${file.name} » dépasse 25 Mo.`);
        continue;
      }
      batch.push({
        file,
        draft: {
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          preview: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          status: 'uploading',
        },
      });
    }

    if (batch.length === 0) return;
    const drafts = batch.map((item) => item.draft);
    setError(null);
    setImages((prev) => [...prev, ...drafts]);
    if (!primaryId) setPrimaryId(drafts[0].id);

    try {
      const uploaded = await uploadProductImages(batch.map((item) => item.file));
      const mapped = drafts.map((draft, idx) => {
        const remote = uploaded[idx];
        return {
          ...draft,
          status: remote ? ('ready' as const) : ('error' as const),
          url: remote?.url,
          error: remote ? undefined : 'Upload incomplet',
        };
      });
      setImages((prev) =>
        prev.map((img) => mapped.find((d) => d.id === img.id) ?? img),
      );

      if (productId) {
        const ready = mapped.filter((img) => img.status === 'ready' && img.url);
        if (ready.length) {
          const next = await api<AdminProductDetail>(
            `/admin/products/${productId}/images`,
            {
              method: 'POST',
              body: JSON.stringify({
                images: ready.map((img, index) => ({
                  url: img.url,
                  altFr: form.nameFr || img.name,
                  sortOrder: images.length + index,
                  isPrimary: !primaryId && index === 0,
                })),
              }),
            },
          );
          hydrate(next);
          flash('Images ajoutées.');
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload impossible';
      setError(message);
      setImages((prev) =>
        prev.map((img) =>
          drafts.some((d) => d.id === img.id)
            ? { ...img, status: 'error', error: message }
            : img,
        ),
      );
    }
  }

  async function removeImage(id: string) {
    const target = images.find((img) => img.id === id);
    if (target?.preview.startsWith('blob:')) URL.revokeObjectURL(target.preview);
    if (editing && target?.persisted && productId) {
      try {
        const next = await api<AdminProductDetail>(
          `/admin/products/${productId}/images/${id}`,
          { method: 'DELETE' },
        );
        hydrate(next);
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Suppression image impossible');
        return;
      }
    }
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      if (primaryId === id) setPrimaryId(next[0]?.id ?? null);
      return next;
    });
  }

  async function markPrimary(id: string) {
    const target = images.find((img) => img.id === id);
    if (editing && target?.persisted && productId) {
      try {
        const next = await api<AdminProductDetail>(
          `/admin/products/${productId}/images/${id}/primary`,
          { method: 'POST' },
        );
        hydrate(next);
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Image principale impossible');
        return;
      }
    }
    setPrimaryId(id);
  }

  async function submit() {
    if (!form.nameFr.trim() || form.nameFr.trim().length < 2) {
      setError('Le nom du produit est requis.');
      return;
    }
    if (!form.categoryId) {
      setError('Choisissez une catégorie.');
      return;
    }
    if (form.price === '' || Number(form.price) < 0) {
      setError('Indiquez un prix valide.');
      return;
    }
    if (form.isPromo) {
      if (!form.promoPrice.trim() || Number(form.promoPrice) < 0) {
        setError('Indiquez un prix promo.');
        return;
      }
      if (Number(form.promoPrice) >= Number(form.price)) {
        setError('Le prix promo doit être inférieur au prix.');
        return;
      }
    }
    if (images.some((img) => img.status === 'uploading')) {
      setError('Attendez la fin de l’envoi des images.');
      return;
    }

    const ready = images.filter((img) => img.status === 'ready' && img.url);
    const nameFr = form.nameFr.trim();

    const payload = {
      nameFr,
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      price: Number(form.price),
      promoPrice: form.isPromo && form.promoPrice ? Number(form.promoPrice) : null,
      purchaseMode: form.purchaseMode,
      hybridThresholdQty:
        form.purchaseMode === 'HYBRID'
          ? Number(form.hybridThresholdQty) || 10
          : undefined,
      packaging: form.packaging.trim() || undefined,
      unitsPerCarton: num(form.unitsPerCarton),
      weightKg: num(form.weightKg),
      volumeMl: num(form.volumeMl),
      originCountry: form.originCountry.trim() || undefined,
      storageConditions: form.storageConditions.trim() || undefined,
      descriptionFr: form.descriptionFr.trim() || undefined,
      ingredients: form.ingredients.trim() || undefined,
      allergens: form.allergens.trim() || undefined,
      currency: 'MAD',
      isActive: form.isActive,
      isFeatured: form.isNew,
      isNew: form.isNew,
      ogImageUrl:
        ready.find((img) => img.id === primaryId)?.url ?? ready[0]?.url,
    };

    setSaving(true);
    setError(null);
    try {
      if (editing && productId) {
        const next = await api<AdminProductDetail>(
          `/admin/products/${productId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        );
        hydrate(next);
        flash('Produit enregistré.');
      } else {
        await api('/admin/products', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            stockQty: Number(form.stockQty) || 0,
            brandId: form.brandId || undefined,
            promoPrice: payload.promoPrice ?? undefined,
            images: ready.map((img, index) => ({
              url: img.url,
              altFr: nameFr,
              altEn: nameFr,
              sortOrder: index,
              isPrimary: img.id === (primaryId ?? ready[0]?.id),
            })),
          }),
        });
        router.push('/admin/produits');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : editing
            ? 'Enregistrement impossible'
            : 'Création produit impossible',
      );
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock(delta: number) {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api<AdminProductDetail>(
        `/admin/products/${productId}/stock`,
        {
          method: 'POST',
          body: JSON.stringify({ delta, reason: 'Ajustement admin' }),
        },
      );
      hydrate(next);
      flash(`Stock ${delta > 0 ? '+' : ''}${delta}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stock impossible');
    } finally {
      setBusy(false);
    }
  }

  async function addLot() {
    if (!productId) return;
    if (lotNumber.trim().length < 1) {
      setError('Indiquez un n° de lot.');
      return;
    }
    if (!lotExpiry) {
      setError('Indiquez une date de péremption.');
      return;
    }
    const quantity = Number(lotQty);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Quantité de lot invalide.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/products/${productId}/lots`, {
        method: 'POST',
        body: JSON.stringify({
          lotNumber: lotNumber.trim(),
          expiryDate: lotExpiry,
          quantity,
        }),
      });
      const next = await api<AdminProductDetail>(
        `/admin/products/${productId}`,
      );
      hydrate(next);
      setLotNumber('');
      setLotExpiry('');
      setLotQty('1');
      flash('Lot ajouté.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lot impossible');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="ad-loading">Chargement du produit…</p>;
  }

  if (editing && !product) {
    return (
      <div>
        <p className="ad-error">{error ?? 'Produit introuvable.'}</p>
        <Link href="/admin/produits" className="ad-btn ad-btn--ghost">
          Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div className="ad-product-new">
      <div className="ad-page-head">
        <div>
          <Link href="/admin/produits" className="ad-back">
            <ArrowLeft size={14} /> Tous les produits
          </Link>
          <h1>{editing ? product?.nameFr || 'Fiche produit' : 'Nouveau produit'}</h1>
          <p>
            {editing
              ? `${product?.sku} · stock ${product?.stockQty ?? 0}`
              : 'Photos, nom, catégorie et prix. SKU, slug et SEO sont générés automatiquement.'}
          </p>
        </div>
        <div className="ad-actions">
          {product?.slugFr ? (
            <Link
              href={`/produits/${product.slugFr}`}
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
            {saving
              ? 'Enregistrement…'
              : editing
                ? 'Enregistrer'
                : 'Créer le produit'}
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}
      {success ? <p className="ad-success">{success}</p> : null}

      <section className="ad-card ad-uploader-card">
        <div className="ad-card__head">
          <h2>Images produit</h2>
          <span className="ad-card__link">
            {images.length}/{MAX_FILES} · jusqu’à 25 Mo
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="ad-uploader__input"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className={`ad-uploader${dragOver ? ' is-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
        >
          <Upload size={28} strokeWidth={1.6} aria-hidden />
          <strong>Ajouter des photos</strong>
          <span>
            Glissez-déposez, ou ouvrez la galerie / l’appareil photo.
            JPG, PNG, WEBP, HEIC, AVIF, GIF, SVG, BMP, TIFF.
          </span>
        </button>

        {images.length > 0 ? (
          <div className="ad-thumbs">
            {images.map((img) => (
              <figure
                key={img.id}
                className={`ad-thumb${primaryId === img.id ? ' is-primary' : ''}${img.status === 'error' ? ' is-error' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(img.url) ?? img.preview}
                  alt={img.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <figcaption>
                  <em>{img.name}</em>
                  <small>
                    {img.status === 'uploading'
                      ? 'Envoi…'
                      : img.status === 'error'
                        ? img.error ?? 'Erreur'
                        : img.size
                          ? formatBytes(img.size)
                          : 'En ligne'}
                  </small>
                </figcaption>
                <div className="ad-thumb__actions">
                  <button
                    type="button"
                    title="Image principale"
                    onClick={() => void markPrimary(img.id)}
                  >
                    <Star
                      size={14}
                      fill={primaryId === img.id ? 'currentColor' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => void removeImage(img.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </figure>
            ))}
            {images.length < MAX_FILES ? (
              <button
                type="button"
                className="ad-thumb ad-thumb--add"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus size={22} aria-hidden />
                Ajouter
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="ad-grid-2">
        <section className="ad-card">
          <h2>Identité</h2>
          <div className="ad-form">
            <label className="ad-field">
              <span>Nom *</span>
              <input
                className="ad-input"
                value={form.nameFr}
                onChange={(e) => patch('nameFr', e.target.value)}
              />
            </label>
            {editing && product?.sku ? (
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>SKU</span>
                  <input className="ad-input" value={product.sku} readOnly />
                </label>
                {product.slugFr ? (
                  <label className="ad-field">
                    <span>Slug</span>
                    <input className="ad-input" value={product.slugFr} readOnly />
                  </label>
                ) : null}
              </div>
            ) : null}
            <label className="ad-field">
              <span>Catégorie *</span>
              <select
                className="ad-select"
                value={form.categoryId}
                onChange={(e) => patch('categoryId', e.target.value)}
              >
                <option value="">Choisir…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameFr}
                  </option>
                ))}
              </select>
            </label>
            {categories.length === 0 ? (
              <p className="ad-empty">
                Aucune catégorie.{' '}
                <Link
                  href="/admin/produits?tab=categories"
                  className="ad-card__link"
                >
                  En créer une
                </Link>
              </p>
            ) : null}
            <label className="ad-field">
              <span>Marque</span>
              <select
                className="ad-select"
                value={form.brandId}
                onChange={(e) => patch('brandId', e.target.value)}
              >
                <option value="">Aucune</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ad-field">
              <span>Description</span>
              <textarea
                className="ad-textarea"
                rows={5}
                value={form.descriptionFr}
                onChange={(e) => patch('descriptionFr', e.target.value)}
              />
            </label>
            <label className="ad-field">
              <span>Ingrédients</span>
              <textarea
                className="ad-textarea"
                value={form.ingredients}
                onChange={(e) => patch('ingredients', e.target.value)}
              />
            </label>
            <label className="ad-field">
              <span>Allergènes</span>
              <input
                className="ad-input"
                value={form.allergens}
                onChange={(e) => patch('allergens', e.target.value)}
              />
            </label>
          </div>
        </section>

        <div>
          {editing ? (
            <section className="ad-card" style={{ marginBottom: '0.85rem' }}>
              <h2>Stock & lots</h2>
              <p>
                Stock actuel : <strong>{product?.stockQty ?? 0}</strong>
              </p>
              <div className="ad-actions" style={{ margin: '0.65rem 0' }}>
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={busy}
                  onClick={() => void adjustStock(-1)}
                >
                  −1
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={busy}
                  onClick={() => void adjustStock(1)}
                >
                  +1
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={busy}
                  onClick={() => void adjustStock(10)}
                >
                  +10
                </button>
              </div>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>Ajustement</span>
                  <input
                    className="ad-input"
                    type="number"
                    value={stockDelta}
                    onChange={(e) => setStockDelta(e.target.value)}
                  />
                </label>
                <div className="ad-field" style={{ justifyContent: 'flex-end' }}>
                  <span>&nbsp;</span>
                  <button
                    type="button"
                    className="ad-btn ad-btn--sm"
                    disabled={busy}
                    onClick={() => void adjustStock(Number(stockDelta) || 0)}
                  >
                    Appliquer
                  </button>
                </div>
              </div>
              {product?.lots?.length ? (
                <ul className="ad-doc-list" style={{ marginTop: '0.75rem' }}>
                  {product.lots.map((lot) => (
                    <li key={lot.id}>
                      {lot.lotNumber} · {lot.quantity} u. · DLC{' '}
                      {formatAdminDay(lot.expiryDate)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ad-empty">Aucun lot enregistré.</p>
              )}
              <div className="ad-form" style={{ marginTop: '0.75rem' }}>
                <label className="ad-field">
                  <span>N° de lot</span>
                  <input
                    className="ad-input"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                  />
                </label>
                <div className="ad-form ad-form--2">
                  <label className="ad-field">
                    <span>Péremption</span>
                    <input
                      className="ad-input"
                      type="date"
                      value={lotExpiry}
                      onChange={(e) => setLotExpiry(e.target.value)}
                    />
                  </label>
                  <label className="ad-field">
                    <span>Quantité</span>
                    <input
                      className="ad-input"
                      type="number"
                      min="1"
                      value={lotQty}
                      onChange={(e) => setLotQty(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  disabled={busy}
                  onClick={() => void addLot()}
                >
                  Ajouter le lot
                </button>
              </div>
            </section>
          ) : null}

          <section className="ad-card" style={{ marginBottom: '0.85rem' }}>
            <h2>Prix & visibilité</h2>
            <div className="ad-form">
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>Prix MAD *</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => patch('price', e.target.value)}
                  />
                </label>
                {form.isPromo ? (
                  <label className="ad-field">
                    <span>Prix promo *</span>
                    <input
                      className="ad-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.promoPrice}
                      onChange={(e) => patch('promoPrice', e.target.value)}
                    />
                  </label>
                ) : null}
              </div>
              {!editing ? (
                <label className="ad-field">
                  <span>Stock initial</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    value={form.stockQty}
                    onChange={(e) => patch('stockQty', e.target.value)}
                  />
                </label>
              ) : null}
              <div className="ad-field">
                <span>Nouveau ou promo</span>
                <p className="ad-muted" style={{ margin: '0 0 0.55rem', fontSize: '0.82rem' }}>
                  Cochez si le produit est une nouveauté, une promotion, ou les deux.
                </p>
                <div className="ad-actions" style={{ margin: 0 }}>
                  <label className="ad-check">
                    <input
                      type="checkbox"
                      checked={form.isNew}
                      onChange={(e) => patch('isNew', e.target.checked)}
                    />
                    Nouveau
                  </label>
                  <label className="ad-check">
                    <input
                      type="checkbox"
                      checked={form.isPromo}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          isPromo: checked,
                          promoPrice: checked ? prev.promoPrice : '',
                        }));
                      }}
                    />
                    Promo
                  </label>
                </div>
              </div>
              <label className="ad-field">
                <span>Mode d’achat</span>
                <select
                  className="ad-select"
                  value={form.purchaseMode}
                  onChange={(e) =>
                    patch(
                      'purchaseMode',
                      e.target.value as typeof form.purchaseMode,
                    )
                  }
                >
                  <option value="DIRECT">Achat direct</option>
                  <option value="QUOTE">Devis uniquement</option>
                  <option value="HYBRID">Hybride</option>
                </select>
              </label>
              {form.purchaseMode === 'HYBRID' ? (
                <label className="ad-field">
                  <span>Seuil devis (qté)</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="1"
                    value={form.hybridThresholdQty}
                    onChange={(e) =>
                      patch('hybridThresholdQty', e.target.value)
                    }
                  />
                </label>
              ) : null}
              <label className="ad-check">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => patch('isActive', e.target.checked)}
                />
                Produit actif (visible boutique)
              </label>
            </div>
          </section>

          <section className="ad-card" style={{ marginBottom: '0.85rem' }}>
            <h2>Logistique</h2>
            <div className="ad-form">
              <label className="ad-field">
                <span>Conditionnement</span>
                <input
                  className="ad-input"
                  placeholder="Sac 25 kg, carton 12×…"
                  value={form.packaging}
                  onChange={(e) => patch('packaging', e.target.value)}
                />
              </label>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>Unités / carton</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="1"
                    value={form.unitsPerCarton}
                    onChange={(e) => patch('unitsPerCarton', e.target.value)}
                  />
                </label>
                <label className="ad-field">
                  <span>Origine</span>
                  <input
                    className="ad-input"
                    value={form.originCountry}
                    onChange={(e) => patch('originCountry', e.target.value)}
                  />
                </label>
                <label className="ad-field">
                  <span>Poids (kg)</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.weightKg}
                    onChange={(e) => patch('weightKg', e.target.value)}
                  />
                </label>
                <label className="ad-field">
                  <span>Volume (ml)</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.volumeMl}
                    onChange={(e) => patch('volumeMl', e.target.value)}
                  />
                </label>
              </div>
              <label className="ad-field">
                <span>Conservation</span>
                <input
                  className="ad-input"
                  placeholder="Sec, frais, à l’abri de la lumière…"
                  value={form.storageConditions}
                  onChange={(e) => patch('storageConditions', e.target.value)}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
