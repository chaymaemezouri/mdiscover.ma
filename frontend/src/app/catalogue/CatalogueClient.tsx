'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { api, getToken, type ProductListItem } from '@/lib/api';
import { OffersProductCard } from '@/components/home/OffersProductCard';
import { CatalogueFilters } from './CatalogueFilters';
import { CatalogueSearch } from './CatalogueSearch';
import { CatalogueSortSelect } from './CatalogueSortSelect';
import {
  CATALOGUE_LIMIT,
  DEFAULT_FILTERS,
  buildSearchQuery,
  filtersToSearchParams,
  getActiveFilterChips,
  mapSearchItemToProduct,
  parseCatalogueParams,
  type CatalogueFiltersState,
  type CatalogueSort,
  type SearchFacets,
  type SearchResponse,
} from './catalogue-data';
import { HOME_CATEGORIES } from '@/lib/home-categories';

const SEARCH_DEBOUNCE_MS = 350;

function pageWindow(current: number, total: number): Array<number | '…'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}

export function CatalogueClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseCatalogueParams(searchParams),
    [searchParams],
  );

  const [searchDraft, setSearchDraft] = useState(filters.q);
  const [items, setItems] = useState<ReturnType<typeof mapSearchItemToProduct>[]>(
    [],
  );
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const searchEditingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);

  const pushFilters = useCallback(
    (next: CatalogueFiltersState, mode: 'push' | 'replace' = 'push') => {
      const sp = filtersToSearchParams(next);
      const qs = sp.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (mode === 'replace') router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const patchFilters = useCallback(
    (patch: Partial<CatalogueFiltersState>, mode: 'push' | 'replace' = 'push') => {
      pushFilters({ ...filters, ...patch }, mode);
    },
    [filters, pushFilters],
  );

  const resetFilters = useCallback(() => {
    setSearchDraft('');
    pushFilters({ ...DEFAULT_FILTERS });
  }, [pushFilters]);

  // Sync search draft when URL q changes (back/forward)
  useEffect(() => {
    if (filters.q === searchDraft.trim()) {
      searchEditingRef.current = false;
      return;
    }
    if (searchEditingRef.current) return;
    setSearchDraft(filters.q);
  }, [filters.q, searchDraft]);

  // Une seule requête pour hydrater l'état des favoris de toutes les cartes.
  useEffect(() => {
    if (!getToken()) return;
    void api<Array<{ product: ProductListItem }>>('/favorites')
      .then((favorites) => {
        setFavoriteIds(new Set(favorites.map((favorite) => favorite.product.id)));
      })
      .catch(() => {
        // Les cartes restent utilisables même si l'état initial est indisponible.
      });
  }, []);

  // Debounced search → URL
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchDraft.trim();
      if (next === filters.q) return;
      patchFilters({ q: next, page: 1 }, 'replace');
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchDraft, filters.q, patchFilters]);

  // Fetch products
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(false);

    const qs = buildSearchQuery(filters);
    void (async () => {
      try {
        const res = await api<SearchResponse>(`/search?${qs}`, {
          auth: false,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const total = res.meta?.total ?? 0;
        const pages = res.meta?.pages ?? 0;
        const page = res.meta?.page ?? 1;
        setItems((res.items ?? []).map(mapSearchItemToProduct));
        setFacets(res.facets ?? null);
        setMeta({ total, page, pages });
        setError(false);
        // Aligne l’URL si le backend a ramené une page hors plage.
        if (pages > 0 && filters.page !== page) {
          patchFilters({ page }, 'replace');
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setItems([]);
        setFacets(null);
        setMeta({ total: 0, page: 1, pages: 0 });
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [filters, retryKey, patchFilters]);

  // Drawer a11y: Escape + focus
  useEffect(() => {
    if (!drawerOpen) return;
    const trigger = drawerTriggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = drawerPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    drawerCloseRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      trigger?.focus();
    };
  }, [drawerOpen]);

  const categoryName =
    facets?.categories.find((c) => c.slugFr === filters.category)?.nameFr ??
    HOME_CATEGORIES.find((c) => c.slugFr === filters.category)?.nameFr;

  const brandName = facets?.brands.find((b) => b.slugFr === filters.brand)?.name;

  const activeChips = getActiveFilterChips(filters, {
    categoryName,
    brandName,
  });

  const rangeStart = meta.total === 0 ? 0 : (meta.page - 1) * CATALOGUE_LIMIT + 1;
  const rangeEnd = Math.min(meta.page * CATALOGUE_LIMIT, meta.total);

  function setSort(sort: CatalogueSort) {
    patchFilters({ sort, page: 1 });
  }

  const handleFavoriteChange = useCallback(
    (productId: string, favorited: boolean) => {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (favorited) next.add(productId);
        else next.delete(productId);
        return next;
      });
    },
    [],
  );

  return (
    <>
      <div className="catalogue__layout">
        <aside className="catalogue__sidebar" aria-label="Filtres catalogue">
          <CatalogueFilters
            filters={filters}
            facets={facets}
            onChange={patchFilters}
            onReset={resetFilters}
          />
        </aside>

        <div className="catalogue__content">
          <div className="catalogue__toolbar">
            <div
              className="catalogue__views"
              role="group"
              aria-label="Affichage des produits"
            >
              <button
                type="button"
                className={`catalogue__view-btn${view === 'grid' ? ' is-active' : ''}`}
                aria-label="Affichage en grille"
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
              >
                <LayoutGrid size={16} strokeWidth={2.2} aria-hidden />
              </button>
              <button
                type="button"
                className={`catalogue__view-btn${view === 'list' ? ' is-active' : ''}`}
                aria-label="Affichage en liste"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                <List size={16} strokeWidth={2.2} aria-hidden />
              </button>
            </div>

            <p className="catalogue__count sr-only" aria-live="polite">
              {loading
                ? 'Chargement des produits'
                : meta.total === 0
                  ? 'Aucun produit'
                  : `${rangeStart} à ${rangeEnd} sur ${meta.total} produits`}
            </p>

            <CatalogueSearch
              value={searchDraft}
              onChange={(value) => {
                searchEditingRef.current = true;
                setSearchDraft(value);
              }}
              onClear={() => {
                searchEditingRef.current = true;
                setSearchDraft('');
                patchFilters({ q: '', page: 1 }, 'replace');
              }}
              onSubmit={() => {
                searchEditingRef.current = false;
                patchFilters({ q: searchDraft.trim(), page: 1 }, 'replace');
              }}
              onSelectCategory={(slug) =>
                patchFilters({ category: slug, q: '', page: 1 })
              }
              onSelectBrand={(slug) =>
                patchFilters({ brand: slug, q: '', page: 1 })
              }
            />

            <div className="catalogue__sort catalogue__sort--desktop">
              <label htmlFor="catalogue-sort">Trier par</label>
              <CatalogueSortSelect
                id="catalogue-sort"
                value={filters.sort}
                onChange={setSort}
              />
            </div>
          </div>

          <div className="catalogue__mobile-bar">
            <button
              ref={drawerTriggerRef}
              type="button"
              className="catalogue__mobile-btn"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <SlidersHorizontal size={16} strokeWidth={2} aria-hidden />
              Filtres
              {activeChips.length > 0 ? ` ${activeChips.length}` : ''}
            </button>
            <div className="catalogue__sort catalogue__sort--mobile">
              <label htmlFor="catalogue-sort-mobile" className="sr-only">
                Trier par
              </label>
              <CatalogueSortSelect
                id="catalogue-sort-mobile"
                value={filters.sort}
                onChange={setSort}
                fullWidth
              />
            </div>
          </div>

          {activeChips.length > 0 ? (
            <div className="catalogue__active" aria-label="Filtres actifs">
              {activeChips.map((chip) => (
                <span key={chip.key} className="catalogue__active-chip">
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Retirer le filtre ${chip.label}`}
                    onClick={() => patchFilters(chip.clear)}
                  >
                    <X size={12} strokeWidth={2.4} aria-hidden />
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="catalogue__clear-all"
                onClick={resetFilters}
              >
                Tout effacer
              </button>
            </div>
          ) : null}

          {loading ? (
            <>
              <div className="catalogue__skel-grid" aria-busy="true" aria-label="Chargement des produits">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="catalogue__skel-card" />
                ))}
              </div>
            </>
          ) : error ? (
            <div className="catalogue__empty" role="alert">
              <h3>Impossible de charger le catalogue.</h3>
              <p>Vérifiez votre connexion puis réessayez.</p>
              <button
                type="button"
                className="catalogue__empty-btn"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                Réessayer
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="catalogue__empty">
              <h3>Aucun produit trouvé</h3>
              <p>Essayez de modifier vos filtres ou votre recherche.</p>
              <button
                type="button"
                className="catalogue__empty-btn"
                onClick={resetFilters}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div
              className={`catalogue__grid${view === 'list' ? ' catalogue__grid--list' : ''}`}
            >
              {items.map((product, index) => (
                <OffersProductCard
                  key={product.id}
                  product={product}
                  priority={index < 4}
                  compact
                  initialFavorited={favoriteIds.has(product.id)}
                  onFavoriteChange={handleFavoriteChange}
                />
              ))}
            </div>
          )}

          {!loading && meta.pages > 1 ? (
            <nav className="catalogue__pager" aria-label="Pagination du catalogue">
              <button
                type="button"
                className="catalogue__page-btn"
                disabled={meta.page <= 1}
                aria-label="Page précédente"
                onClick={() => patchFilters({ page: meta.page - 1 })}
              >
                <ChevronLeft size={16} strokeWidth={2.2} aria-hidden />
              </button>
              {pageWindow(meta.page, meta.pages).map((p, i) =>
                p === '…' ? (
                  <span key={`e-${i}`} className="catalogue__page-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`catalogue__page-btn${
                      p === meta.page ? ' is-active' : ''
                    }`}
                    aria-current={p === meta.page ? 'page' : undefined}
                    onClick={() => patchFilters({ page: p })}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                className="catalogue__page-btn"
                disabled={meta.page >= meta.pages}
                aria-label="Page suivante"
                onClick={() => patchFilters({ page: meta.page + 1 })}
              >
                <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
              </button>
            </nav>
          ) : null}
        </div>
      </div>

      {drawerOpen ? (
        <div className="catalogue-drawer" role="dialog" aria-modal="true" aria-label="Filtres">
          <button
            type="button"
            className="catalogue-drawer__backdrop"
            aria-label="Fermer les filtres"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerPanelRef}
            className="catalogue-drawer__panel"
            role="document"
          >
            <div className="catalogue-drawer__head">
              <h2>Filtres</h2>
              <button
                ref={drawerCloseRef}
                type="button"
                className="catalogue-drawer__close"
                aria-label="Fermer"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={18} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
            <div className="catalogue-drawer__body">
              <CatalogueFilters
                filters={filters}
                facets={facets}
                onChange={patchFilters}
                onReset={resetFilters}
                hideHeader
              />
            </div>
            <div className="catalogue-drawer__foot">
              <button
                type="button"
                className="catalogue-drawer__reset"
                onClick={resetFilters}
                disabled={activeChips.length === 0}
              >
                Réinitialiser
              </button>
              <button
                type="button"
                className="catalogue-drawer__apply"
                onClick={() => setDrawerOpen(false)}
              >
                Voir {meta.total} produit{meta.total === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
