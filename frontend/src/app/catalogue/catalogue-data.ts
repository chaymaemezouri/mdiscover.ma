import type { ProductListItem } from '@/lib/api';

export type CatalogueSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'popularity'
  | 'best_rated'
  | 'best_sellers';

export type CatalogueFiltersState = {
  q: string;
  category: string;
  brand: string;
  inStock: boolean;
  onPromo: boolean;
  isNew: boolean;
  minPrice: string;
  maxPrice: string;
  sort: CatalogueSort;
  page: number;
};

export type SearchProductItem = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  currency: string;
  stockQty: number;
  packaging?: string | null;
  ratingsAvg?: number;
  ratingsCount?: number;
  isNew?: boolean;
  brand?: { name: string; slugFr: string; slugEn?: string } | null;
  category?: {
    nameFr: string;
    nameEn?: string;
    slugFr: string;
    slugEn?: string;
  } | null;
  image?: { url: string; altFr?: string | null; altEn?: string | null } | null;
  createdAt?: string;
};

export type SearchFacets = {
  priceRange: { min: number; max: number };
  counts: { total: number; onPromo: number; inStock: number };
  brands: Array<{
    id: string;
    name: string;
    slugFr: string;
    slugEn?: string;
    count: number;
  }>;
  categories: Array<{
    id: string;
    nameFr: string;
    nameEn?: string;
    slugFr: string;
    slugEn?: string;
    count: number;
  }>;
};

export type SearchResponse = {
  items: SearchProductItem[];
  facets: SearchFacets;
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    sort: CatalogueSort;
    q: string | null;
  };
};

export const CATALOGUE_LIMIT = 24;

export const SORT_OPTIONS: Array<{ value: CatalogueSort; label: string }> = [
  { value: 'newest', label: 'Pertinence' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'popularity', label: 'Popularité' },
  { value: 'best_rated', label: 'Mieux notés' },
  { value: 'best_sellers', label: 'Meilleures ventes' },
];

export const DEFAULT_FILTERS: CatalogueFiltersState = {
  q: '',
  category: '',
  brand: '',
  inStock: false,
  onPromo: false,
  isNew: false,
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
  page: 1,
};

const SORT_SET = new Set<string>(SORT_OPTIONS.map((o) => o.value));

function truthy(value: string | null): boolean {
  if (!value) return false;
  return value === '1' || value === 'true' || value === 'yes';
}

export function parseCatalogueParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): CatalogueFiltersState {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) {
      return params.get(key)?.trim() ?? '';
    }
    const raw = params[key];
    if (Array.isArray(raw)) return (raw[0] ?? '').trim();
    return (raw ?? '').trim();
  };

  let sortRaw = get('sort');
  const fromNewNav = sortRaw === 'new';
  if (sortRaw === 'new' || sortRaw === 'pertinence') sortRaw = 'newest';
  const sort = SORT_SET.has(sortRaw)
    ? (sortRaw as CatalogueSort)
    : DEFAULT_FILTERS.sort;

  const pageNum = Number(get('page'));
  const page = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;

  const promoLegacy = truthy(get('promo'));
  const onPromo = truthy(get('onPromo')) || promoLegacy;
  const isNew = truthy(get('isNew')) || fromNewNav;

  return {
    q: get('q'),
    category: get('category'),
    brand: get('brand'),
    inStock: truthy(get('inStock')),
    onPromo,
    isNew,
    minPrice: get('minPrice'),
    maxPrice: get('maxPrice'),
    sort,
    page,
  };
}

export function filtersToSearchParams(
  filters: CatalogueFiltersState,
  opts?: { omitPage?: boolean },
): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q.trim()) sp.set('q', filters.q.trim());
  if (filters.category) sp.set('category', filters.category);
  if (filters.brand) sp.set('brand', filters.brand);
  if (filters.inStock) sp.set('inStock', 'true');
  if (filters.onPromo) sp.set('onPromo', 'true');
  if (filters.isNew) sp.set('isNew', 'true');
  if (filters.minPrice.trim()) sp.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice.trim()) sp.set('maxPrice', filters.maxPrice.trim());
  if (filters.sort && filters.sort !== 'newest') sp.set('sort', filters.sort);
  if (!opts?.omitPage && filters.page > 1) sp.set('page', String(filters.page));
  return sp;
}

export function buildSearchQuery(filters: CatalogueFiltersState): string {
  const sp = new URLSearchParams();
  if (filters.q.trim()) sp.set('q', filters.q.trim());
  if (filters.category) sp.set('category', filters.category);
  if (filters.brand) sp.set('brand', filters.brand);
  if (filters.inStock) sp.set('inStock', 'true');
  if (filters.onPromo) sp.set('onPromo', 'true');
  if (filters.isNew) sp.set('isNew', 'true');
  if (filters.minPrice.trim()) sp.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice.trim()) sp.set('maxPrice', filters.maxPrice.trim());
  sp.set('sort', filters.sort);
  sp.set('page', String(filters.page));
  sp.set('limit', String(CATALOGUE_LIMIT));
  sp.set('locale', 'fr');
  return sp.toString();
}

export function mapSearchItemToProduct(item: SearchProductItem): ProductListItem {
  return {
    id: item.id,
    sku: item.sku,
    slugFr: item.slug,
    slugEn: item.slug,
    nameFr: item.name,
    nameEn: item.name,
    price: item.price,
    promoPrice: item.promoPrice ?? null,
    currency: item.currency,
    stockQty: item.stockQty,
    packaging: item.packaging ?? null,
    ratingsAvg: item.ratingsAvg,
    ratingsCount: item.ratingsCount,
    isNew: item.isNew,
    images: item.image
      ? [{ url: item.image.url, isPrimary: true, altFr: item.image.altFr }]
      : [],
    category: item.category
      ? { nameFr: item.category.nameFr, slugFr: item.category.slugFr }
      : undefined,
    brand: item.brand
      ? { name: item.brand.name, slugFr: item.brand.slugFr }
      : null,
    createdAt: item.createdAt,
  };
}

export type ActiveFilterChip = {
  key: string;
  label: string;
  clear: Partial<CatalogueFiltersState>;
};

export function getActiveFilterChips(
  filters: CatalogueFiltersState,
  labels?: {
    categoryName?: string;
    brandName?: string;
  },
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.q.trim()) {
    chips.push({
      key: 'q',
      label: `« ${filters.q.trim()} »`,
      clear: { q: '', page: 1 },
    });
  }
  if (filters.category) {
    chips.push({
      key: 'category',
      label: labels?.categoryName ?? filters.category,
      clear: { category: '', page: 1 },
    });
  }
  if (filters.brand) {
    chips.push({
      key: 'brand',
      label: labels?.brandName ?? filters.brand,
      clear: { brand: '', page: 1 },
    });
  }
  if (filters.inStock) {
    chips.push({
      key: 'inStock',
      label: 'En stock',
      clear: { inStock: false, page: 1 },
    });
  }
  if (filters.onPromo) {
    chips.push({
      key: 'onPromo',
      label: 'Promotions',
      clear: { onPromo: false, page: 1 },
    });
  }
  if (filters.isNew) {
    chips.push({
      key: 'isNew',
      label: 'Nouveautés',
      clear: { isNew: false, page: 1 },
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice || '0';
    const max = filters.maxPrice || '∞';
    chips.push({
      key: 'price',
      label: `${min}–${max} MAD`,
      clear: { minPrice: '', maxPrice: '', page: 1 },
    });
  }

  return chips;
}

export function countActiveFilters(filters: CatalogueFiltersState): number {
  return getActiveFilterChips(filters).length;
}
