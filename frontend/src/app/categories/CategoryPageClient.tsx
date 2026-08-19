'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { QuoteGate } from '@/components/QuoteGate';
import {
  SORT_OPTIONS,
  type CatalogueSort,
} from '@/app/catalogue/catalogue-data';
import type { ProductListItem } from '@/lib/api';
import { isNewArrival } from '@/lib/product';
import type { CategorySubFilter } from '@/lib/category-page';
import { productMatchesSubFilter } from '@/lib/category-page';

type QuickFilter = 'all' | 'inStock' | 'promo' | 'new';

type CategoryPageClientProps = {
  products: ProductListItem[];
  categorySlug: string;
  categoryName: string;
  total: number;
  subFilters?: CategorySubFilter[];
  siblingCategories?: Array<{ slugFr: string; nameFr: string }>;
};

function productPrice(p: ProductListItem): number {
  const raw = p.promoPrice ?? p.price;
  return Number(raw) || 0;
}

function sortProducts(items: ProductListItem[], sort: CatalogueSort): ProductListItem[] {
  const copy = [...items];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => productPrice(a) - productPrice(b));
    case 'price_desc':
      return copy.sort((a, b) => productPrice(b) - productPrice(a));
    case 'best_rated':
      return copy.sort(
        (a, b) =>
          Number(b.ratingsAvg ?? 0) - Number(a.ratingsAvg ?? 0) ||
          (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0),
      );
    case 'popularity':
    case 'best_sellers':
      return copy.sort(
        (a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0),
      );
    case 'newest':
    default:
      return copy.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }
}

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'inStock', label: 'En stock' },
  { id: 'promo', label: 'Promotions' },
  { id: 'new', label: 'Nouveautés' },
];

export function CategoryPageClient({
  products,
  categorySlug,
  categoryName,
  total,
  subFilters = [],
  siblingCategories = [],
}: CategoryPageClientProps) {
  const [sort, setSort] = useState<CatalogueSort>('newest');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [subFilter, setSubFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = [...products];

    if (quickFilter === 'inStock') {
      items = items.filter((p) => p.stockQty > 0);
    } else if (quickFilter === 'promo') {
      items = items.filter((p) => p.promoPrice != null);
    } else if (quickFilter === 'new') {
      items = items.filter((p) => isNewArrival(p));
    }

    if (subFilter) {
      const match = subFilters.find((f) => f.id === subFilter);
      if (match) {
        items = items.filter((p) => productMatchesSubFilter(p, match));
      }
    }

    return sortProducts(items, sort);
  }, [products, quickFilter, subFilter, subFilters, sort]);

  const countLabel = `${filtered.length} produit${filtered.length > 1 ? 's' : ''}`;

  return (
    <div className="cat-page__listing" id="cat-products">
      <div className="cat-page__toolbar">
        <div className="cat-page__toolbar-main">
          <div className="cat-page__toolbar-head">
            <h2>Sélection {categoryName.toLowerCase()}</h2>
            <p>
              {countLabel}
              {filtered.length !== total ? ` sur ${total}` : ''}
            </p>
          </div>
          <div className="cat-page__sort">
            <label htmlFor="cat-sort" className="cat-page__sort-label">
              Trier par
            </label>
            <div className="cat-page__sort-wrap">
              <select
                id="cat-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as CatalogueSort)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden />
            </div>
          </div>
        </div>

        <div className="cat-page__filters" role="group" aria-label="Filtres rapides">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`cat-page__filter${quickFilter === f.id ? ' is-active' : ''}`}
              onClick={() => setQuickFilter(f.id)}
              aria-pressed={quickFilter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        {subFilters.length > 0 ? (
          <div
            className="cat-page__subfilters"
            role="group"
            aria-label="Sous-catégories"
          >
            <button
              type="button"
              className={`cat-page__subfilter${subFilter === null ? ' is-active' : ''}`}
              onClick={() => setSubFilter(null)}
              aria-pressed={subFilter === null}
            >
              Tout voir
            </button>
            {subFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`cat-page__subfilter${subFilter === f.id ? ' is-active' : ''}`}
                onClick={() => setSubFilter(f.id)}
                aria-pressed={subFilter === f.id}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}

        {siblingCategories.length > 1 ? (
          <nav className="cat-page__siblings" aria-label="Autres catégories">
            {siblingCategories.map((cat) => (
              <Link
                key={cat.slugFr}
                href={`/categories/${cat.slugFr}`}
                className={`cat-page__sibling${cat.slugFr === categorySlug ? ' is-active' : ''}`}
                aria-current={cat.slugFr === categorySlug ? 'page' : undefined}
              >
                {cat.nameFr}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div className="cat-page__grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="cat-page__empty">
          Aucun produit ne correspond à vos filtres pour le moment.
        </p>
      )}

      <QuoteGate>
        <section className="cat-page__b2b" aria-labelledby="cat-b2b-title">
          <div className="cat-page__b2b-copy">
            <p className="cat-page__b2b-kicker">Volumes professionnels</p>
            <h2 id="cat-b2b-title">
              Besoin de quantités ou d’un approvisionnement sur mesure&nbsp;?
            </h2>
            <p>
              Formats bulk, sourcing spécifique ou livraison récurrente — notre
              équipe vous accompagne pour structurer votre approvisionnement B2B.
            </p>
          </div>
          <Link href={`/devis?category=${encodeURIComponent(categorySlug)}`} className="cat-page__b2b-cta">
            Demander un devis
            <ArrowUpRight size={18} aria-hidden />
          </Link>
        </section>
      </QuoteGate>
    </div>
  );
}
