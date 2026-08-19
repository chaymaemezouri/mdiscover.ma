'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, RefreshCw, Search, Trash2, X } from 'lucide-react';
import {
  api,
  apiDownload,
  asList,
  formatPrice,
  mediaUrl,
  statusLabel,
  type ProductListItem,
} from '@/lib/api';
import { useAdminConfirm } from '../AdminConfirm';

type Category = {
  id: string;
  nameFr: string;
  nameEn?: string;
  slugFr?: string;
  isActive?: boolean;
  parentId?: string | null;
  sortOrder?: number;
  imageUrl?: string | null;
  parent?: { id?: string; nameFr: string } | null;
  children?: Array<{ id: string; nameFr: string }>;
  _count?: { products?: number; children?: number };
};

type Tab = 'produits' | 'categories';

function primaryImage(p: ProductListItem) {
  return p.images?.find((img) => img.isPrimary)?.url ?? p.images?.[0]?.url;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const tab: Tab =
    search.get('tab') === 'categories' ? 'categories' : 'produits';
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, dialog } = useAdminConfirm();

  function load() {
    setLoading(true);
    Promise.all([
      api<ProductListItem[] | { items: ProductListItem[] }>('/admin/products'),
      api<Category[]>('/admin/categories').catch(() => []),
    ])
      .then(([list, cats]) => {
        setProducts(asList(list));
        setCategories(asList(cats));
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (search.get('new') === '1') {
      router.replace('/admin/produits/nouveau');
    }
  }, [search, router]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) =>
      `${p.sku} ${p.nameFr} ${p.nameEn ?? ''} ${p.category?.nameFr ?? ''} ${p.brand?.name ?? ''} ${p.packaging ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [products, q]);

  const filteredCats = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((c) =>
      `${c.nameFr} ${c.nameEn ?? ''} ${c.slugFr ?? ''} ${c.parent?.nameFr ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [categories, q]);

  async function removeProduct(product: ProductListItem) {
    const ok = await confirm({
      title: 'Supprimer ce produit ?',
      description: `« ${product.nameFr} » (${product.sku}) sera retiré du catalogue. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setBusyId(product.id);
    setError(null);
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setBusyId(null);
    }
  }

  function exportCategoriesCsv() {
    const header = ['Nom FR', 'Nom EN', 'Slug', 'Parent', 'Produits', 'Statut'];
    const rows = filteredCats.map((c) => [
      c.nameFr,
      c.nameEn ?? '',
      c.slugFr ?? '',
      c.parent?.nameFr ?? '',
      String(c._count?.products ?? 0),
      c.isActive === false ? 'Inactive' : 'Active',
    ]);
    const csv = [header, ...rows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'),
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'categories.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>{tab === 'categories' ? 'Catégories' : 'Produits'}</h1>
          <p>
            {tab === 'categories'
              ? `${categories.length} catégorie${categories.length > 1 ? 's' : ''} · arborescence du catalogue.`
              : `${products.length} produit${products.length > 1 ? 's' : ''} · stocks, prix et fiches.`}
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
          {tab === 'produits' ? (
            <>
              <button
                type="button"
                className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() =>
                  void apiDownload('/admin/export/products', 'produits.csv')
                }
              >
                <Download size={13} aria-hidden /> Export CSV
              </button>
              <Link href="/admin/produits/nouveau" className="ad-btn">
                + Nouveau produit
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() => exportCategoriesCsv()}
              >
                <Download size={13} aria-hidden /> Export CSV
              </button>
              <Link href="/admin/produits/categorie/nouveau" className="ad-btn">
                + Nouvelle catégorie
              </Link>
            </>
          )}
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      <label className="ad-search-wrap">
        <Search size={18} strokeWidth={1.8} aria-hidden />
        <input
          className="ad-search"
          placeholder={
            tab === 'produits'
              ? 'Rechercher un produit par nom, SKU, catégorie ou marque…'
              : 'Rechercher une catégorie par nom, slug ou parent…'
          }
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
          {tab === 'produits'
            ? `${filtered.length} produit${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`
            : `${filteredCats.length} catégorie${filteredCats.length > 1 ? 's' : ''} trouvée${filteredCats.length > 1 ? 's' : ''}`}
        </p>
      ) : null}

      {tab === 'produits' ? (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Stock</th>
                <th>Mode</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const photo = primaryImage(p);
                return (
                  <tr
                    key={p.id}
                    className="ad-row-click"
                    onClick={() => router.push(`/admin/produits/${p.id}`)}
                  >
                    <td>
                      <span className="ad-prod-cell">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="ad-prod-photo"
                            src={mediaUrl(photo) ?? photo}
                            alt=""
                          />
                        ) : (
                          <span className="ad-prod-photo ad-prod-photo--empty" />
                        )}
                        <span>
                          <strong>{p.nameFr}</strong>
                          <span className="ad-muted">
                            {' '}
                            · {p.sku}
                            {p.isNew ? ' · Nouveau' : ''}
                            {p.promoPrice ? ' · Promo' : ''}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>{p.category?.nameFr ?? '—'}</td>
                    <td>
                      {formatPrice(p.promoPrice ?? p.price, p.currency)}
                      {p.promoPrice ? (
                        <span className="ad-muted">
                          {' '}
                          · {formatPrice(p.price, p.currency)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={
                          p.stockQty <= 10 ? 'ad-badge ad-badge--warn' : undefined
                        }
                      >
                        {p.stockQty}
                      </span>
                    </td>
                    <td>{statusLabel(p.purchaseMode ?? 'DIRECT')}</td>
                    <td>
                      <span
                        className={`ad-badge ${p.isActive === false ? 'ad-badge--mute' : 'ad-badge--ok'}`}
                      >
                        {p.isActive === false ? 'Inactif' : 'Actif'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ad-icon-btn"
                        title="Supprimer"
                        aria-label={`Supprimer ${p.nameFr}`}
                        disabled={busyId === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeProduct(p);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
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
              Aucun produit. Cliquez sur « Nouveau produit » pour en ajouter un.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Catégorie</th>
                <th>Parent</th>
                <th>Produits</th>
                <th>Sous-cat.</th>
                <th>Ordre</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredCats.map((c) => (
                <tr
                  key={c.id}
                  className="ad-row-click"
                  onClick={() =>
                    router.push(`/admin/produits/categorie/${c.id}`)
                  }
                >
                  <td>
                    <span className="ad-prod-cell">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="ad-prod-photo"
                          src={mediaUrl(c.imageUrl) ?? c.imageUrl}
                          alt=""
                        />
                      ) : (
                        <span className="ad-prod-photo ad-prod-photo--empty" />
                      )}
                      <span>
                        <strong>{c.nameFr}</strong>
                        <span className="ad-muted">
                          {' '}
                          · {c.slugFr ?? 'sans slug'}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td>{c.parent?.nameFr ?? '—'}</td>
                  <td>{c._count?.products ?? 0}</td>
                  <td>{c._count?.children ?? c.children?.length ?? 0}</td>
                  <td>{c.sortOrder ?? 0}</td>
                  <td>
                    <span
                      className={`ad-badge ${c.isActive === false ? 'ad-badge--mute' : 'ad-badge--ok'}`}
                    >
                      {c.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? (
            <p className="ad-empty" style={{ padding: '1rem' }}>
              Chargement…
            </p>
          ) : filteredCats.length === 0 ? (
            <p className="ad-empty" style={{ padding: '1rem' }}>
              Aucune catégorie. Cliquez sur « Nouvelle catégorie » pour en
              créer une.
            </p>
          ) : null}
        </div>
      )}
      {dialog}
    </div>
  );
}
