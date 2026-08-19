'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { CatalogueFiltersState, SearchFacets } from './catalogue-data';
import { HOME_CATEGORIES } from '@/lib/home-categories';

type CollapsibleId = 'categories' | 'brands';

type CatalogueFiltersProps = {
  filters: CatalogueFiltersState;
  facets: SearchFacets | null;
  onChange: (patch: Partial<CatalogueFiltersState>) => void;
  onReset: () => void;
  hideHeader?: boolean;
};

function GroupTitle({
  children,
  activeCount,
}: {
  children: ReactNode;
  activeCount?: number;
}) {
  return (
    <span className="catalogue-filters__label">
      {children}
      {activeCount ? (
        <span className="catalogue-filters__badge">{activeCount}</span>
      ) : null}
    </span>
  );
}

function Collapsible({
  id,
  title,
  open,
  activeCount,
  onToggle,
  children,
}: {
  id: CollapsibleId;
  title: string;
  open: boolean;
  activeCount: number;
  onToggle: (id: CollapsibleId) => void;
  children: ReactNode;
}) {
  const panelId = `${id}-panel`;
  return (
    <section className="catalogue-filters__group">
      <button
        type="button"
        className="catalogue-filters__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
      >
        <GroupTitle activeCount={activeCount}>{title}</GroupTitle>
        <ChevronDown aria-hidden strokeWidth={2.2} />
      </button>
      <div id={panelId} className="catalogue-filters__panel" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

function CheckRow({
  checked,
  label,
  count,
  onChange,
}: {
  checked: boolean;
  label: string;
  count?: number;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <label className="catalogue-check" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="catalogue-check__box" aria-hidden>
        <Check strokeWidth={3.2} />
      </span>
      <span className="catalogue-check__label">{label}</span>
      {typeof count === 'number' ? (
        <span className="catalogue-check__count">{count}</span>
      ) : null}
    </label>
  );
}

const VISIBLE_ROWS = 5;

function LimitedList({
  total,
  children,
}: {
  total: number;
  children: (limit: number) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = total - VISIBLE_ROWS;
  return (
    <>
      <div className="catalogue-filters__list">
        {children(expanded ? total : VISIBLE_ROWS)}
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          className="catalogue-filters__more"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Afficher moins' : 'Afficher plus'}
        </button>
      ) : null}
    </>
  );
}

export function CatalogueFilters({
  filters,
  facets,
  onChange,
  onReset,
  hideHeader = false,
}: CatalogueFiltersProps) {
  const [open, setOpen] = useState<Record<CollapsibleId, boolean>>({
    categories: true,
    brands: false,
  });

  function toggle(id: CollapsibleId) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const categories = facets?.categories?.length
    ? facets.categories
    : HOME_CATEGORIES.map((c) => ({
        id: c.slugFr,
        nameFr: c.nameFr,
        slugFr: c.slugFr,
        count: undefined as number | undefined,
      }));
  const brands = facets?.brands ?? [];
  const priceActive = Number(Boolean(filters.minPrice)) + Number(Boolean(filters.maxPrice));

  const [minDraft, setMinDraft] = useState(filters.minPrice);
  const [maxDraft, setMaxDraft] = useState(filters.maxPrice);

  useEffect(() => {
    setMinDraft(filters.minPrice);
    setMaxDraft(filters.maxPrice);
  }, [filters.minPrice, filters.maxPrice]);

  function commitPrice() {
    if (minDraft === filters.minPrice && maxDraft === filters.maxPrice) return;
    onChange({ minPrice: minDraft, maxPrice: maxDraft, page: 1 });
  }

  return (
    <div className="catalogue-filters">
      {!hideHeader ? (
        <div className="catalogue-filters__head">
          <h2 className="catalogue-filters__title">Filtres</h2>
          <button
            type="button"
            className="catalogue-filters__reset"
            onClick={onReset}
          >
            Tout effacer
          </button>
        </div>
      ) : null}

      <Collapsible
        id="categories"
        title="Catégories"
        open={open.categories}
        activeCount={filters.category ? 1 : 0}
        onToggle={toggle}
      >
        {categories.length === 0 ? (
          <p className="catalogue-filters__hint">Aucune catégorie.</p>
        ) : (
          <LimitedList total={categories.length}>
            {(limit) =>
              categories.slice(0, limit).map((cat) => (
                <CheckRow
                  key={cat.id}
                  label={cat.nameFr}
                  count={'count' in cat ? cat.count : undefined}
                  checked={filters.category === cat.slugFr}
                  onChange={(checked) =>
                    onChange({ category: checked ? cat.slugFr : '', page: 1 })
                  }
                />
              ))
            }
          </LimitedList>
        )}
      </Collapsible>

      <Collapsible
        id="brands"
        title="Marques"
        open={open.brands}
        activeCount={filters.brand ? 1 : 0}
        onToggle={toggle}
      >
        {brands.length === 0 ? (
          <p className="catalogue-filters__hint">Aucune marque.</p>
        ) : (
          <LimitedList total={brands.length}>
            {(limit) =>
              brands.slice(0, limit).map((brand) => (
                <CheckRow
                  key={brand.id}
                  label={brand.name}
                  count={brand.count}
                  checked={filters.brand === brand.slugFr}
                  onChange={(checked) =>
                    onChange({ brand: checked ? brand.slugFr : '', page: 1 })
                  }
                />
              ))
            }
          </LimitedList>
        )}
      </Collapsible>

      <section className="catalogue-filters__group catalogue-filters__group--plain">
        <GroupTitle activeCount={filters.inStock ? 1 : 0}>
          Disponibilité
        </GroupTitle>
        <div
          className="catalogue-filters__pills"
          role="group"
          aria-label="Disponibilité"
        >
          <button
            type="button"
            className={`catalogue-pill${!filters.inStock ? ' is-active' : ''}`}
            aria-pressed={!filters.inStock}
            onClick={() => onChange({ inStock: false, page: 1 })}
          >
            Tous
          </button>
          <button
            type="button"
            className={`catalogue-pill${filters.inStock ? ' is-active' : ''}`}
            aria-pressed={filters.inStock}
            onClick={() => onChange({ inStock: true, page: 1 })}
          >
            En stock
            {typeof facets?.counts.inStock === 'number' ? (
              <span>{facets.counts.inStock}</span>
            ) : null}
          </button>
        </div>
      </section>

      <section className="catalogue-filters__group catalogue-filters__group--plain">
        <GroupTitle activeCount={priceActive}>Prix</GroupTitle>
        <div className="catalogue-filters__price">
          <label className="catalogue-filters__field">
            <span className="sr-only">Prix minimum en dirhams</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="Min"
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitPrice();
                }
              }}
            />
            <span className="catalogue-filters__currency" aria-hidden>
              MAD
            </span>
          </label>
          <span className="catalogue-filters__dash" aria-hidden>
            –
          </span>
          <label className="catalogue-filters__field">
            <span className="sr-only">Prix maximum en dirhams</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="Max"
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitPrice();
                }
              }}
            />
            <span className="catalogue-filters__currency" aria-hidden>
              MAD
            </span>
          </label>
        </div>
      </section>

      <section className="catalogue-filters__group catalogue-filters__group--plain">
        <label className="catalogue-switch">
          <input
            type="checkbox"
            checked={filters.onPromo}
            onChange={(e) => onChange({ onPromo: e.target.checked, page: 1 })}
          />
          <span className="catalogue-switch__label">Promotions uniquement</span>
          <span className="catalogue-switch__track" aria-hidden>
            <span className="catalogue-switch__thumb" />
          </span>
        </label>
        <label className="catalogue-switch">
          <input
            type="checkbox"
            checked={filters.isNew}
            onChange={(e) => onChange({ isNew: e.target.checked, page: 1 })}
          />
          <span className="catalogue-switch__label">Nouveautés uniquement</span>
          <span className="catalogue-switch__track" aria-hidden>
            <span className="catalogue-switch__thumb" />
          </span>
        </label>
      </section>
    </div>
  );
}
