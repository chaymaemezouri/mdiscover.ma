'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Tag, X } from 'lucide-react';
import { api, formatPrice, mediaUrl } from '@/lib/api';

const SUGGEST_DEBOUNCE_MS = 220;
const MAX_PRODUCTS = 5;
const MAX_REFINEMENTS = 2;

type SuggestResponse = {
  products: Array<{
    id: string;
    slugFr: string;
    nameFr: string;
    price: number;
    promoPrice?: number | null;
    currency: string;
    image?: { url: string } | null;
  }>;
  categories: Array<{
    id: string;
    slugFr: string;
    nameFr: string;
    count: number;
  }>;
  brands: Array<{
    id: string;
    slugFr: string;
    name: string;
    count: number;
  }>;
};

type Suggestion =
  | {
      kind: 'product';
      key: string;
      label: string;
      slug: string;
      price: number;
      currency: string;
      image: string | null;
    }
  | {
      kind: 'category' | 'brand';
      key: string;
      label: string;
      slug: string;
      count: number;
    };

type CatalogueSearchProps = {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectBrand: (slug: string) => void;
};

export function CatalogueSearch({
  value,
  onChange,
  onClear,
  onSubmit,
  onSelectCategory,
  onSelectBrand,
}: CatalogueSearchProps) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = value.trim();

  useEffect(() => {
    if (query.length < 2) {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      setSuggestions([]);
      setOpen(false);
      setBusy(false);
      setActiveIndex(-1);
      return;
    }

    const handle = window.setTimeout(() => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      void (async () => {
        try {
          const res = await api<SuggestResponse>(
            `/search/suggest?q=${encodeURIComponent(query)}&limit=${MAX_PRODUCTS}`,
            { auth: false, signal: controller.signal },
          );
          if (
            controller.signal.aborted ||
            requestId !== requestIdRef.current
          ) {
            return;
          }

          const products: Suggestion[] = (res.products ?? [])
            .slice(0, MAX_PRODUCTS)
            .map((item) => ({
              kind: 'product',
              key: `p-${item.id}`,
              label: item.nameFr,
              slug: item.slugFr,
              price: item.promoPrice ?? item.price,
              currency: item.currency,
              image: mediaUrl(item.image?.url),
            }));

          const categories: Suggestion[] = (res.categories ?? [])
            .slice(0, MAX_REFINEMENTS)
            .map((c) => ({
              kind: 'category',
              key: `c-${c.id}`,
              label: c.nameFr,
              slug: c.slugFr,
              count: c.count,
            }));

          const brands: Suggestion[] = (res.brands ?? [])
            .slice(0, MAX_REFINEMENTS)
            .map((b) => ({
              kind: 'brand',
              key: `b-${b.id}`,
              label: b.name,
              slug: b.slugFr,
              count: b.count,
            }));

          setSuggestions([...products, ...categories, ...brands]);
          setActiveIndex(-1);
          setOpen(true);
        } catch {
          if (
            !controller.signal.aborted &&
            requestId === requestIdRef.current
          ) {
            setSuggestions([]);
          }
        } finally {
          if (
            !controller.signal.aborted &&
            requestId === requestIdRef.current
          ) {
            setBusy(false);
          }
        }
      })();
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [query]);

  useEffect(() => {
    function onDocPointer(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, []);

  function pick(suggestion: Suggestion) {
    setOpen(false);
    setActiveIndex(-1);
    if (suggestion.kind === 'product') {
      router.push(`/produits/${suggestion.slug}`);
      return;
    }
    onChange('');
    if (suggestion.kind === 'category') onSelectCategory(suggestion.slug);
    else onSelectBrand(suggestion.slug);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      pick(suggestions[activeIndex]);
      return;
    }
    setOpen(false);
    onSubmit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  function clear() {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    onClear();
    setSuggestions([]);
    setOpen(false);
    setBusy(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  const showList = open && suggestions.length > 0;

  return (
    <div className="catalogue__search-wrap" ref={wrapRef}>
      <form className="catalogue__search" onSubmit={submit} role="search">
        <label htmlFor="catalogue-search" className="sr-only">
          Rechercher un produit
        </label>
        <Search
          className="catalogue__search-icon"
          strokeWidth={2}
          size={16}
          aria-hidden
        />
        <input
          id="catalogue-search"
          ref={inputRef}
          className="catalogue__search-input"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher un produit, une marque, une référence…"
          autoComplete="off"
        />
        {busy ? (
          <Loader2
            className="catalogue__search-spin"
            size={15}
            strokeWidth={2}
            aria-hidden
          />
        ) : value ? (
          <button
            type="button"
            className="catalogue__search-clear"
            aria-label="Effacer la recherche"
            onClick={clear}
          >
            <X size={14} strokeWidth={2.4} aria-hidden />
          </button>
        ) : null}
      </form>

      {showList ? (
        <ul className="catalogue__suggest" id={listId} role="listbox">
          {suggestions.map((s, index) => (
            <li
              key={s.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`catalogue__suggest-item${
                index === activeIndex ? ' is-active' : ''
              }${s.kind !== 'product' ? ' catalogue__suggest-item--refine' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
            >
              {s.kind === 'product' ? (
                <>
                  <span className="catalogue__suggest-thumb" aria-hidden>
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt="" loading="lazy" />
                    ) : null}
                  </span>
                  <span className="catalogue__suggest-label">{s.label}</span>
                  <span className="catalogue__suggest-price">
                    {formatPrice(s.price, s.currency)}
                  </span>
                </>
              ) : (
                <>
                  <span className="catalogue__suggest-tag" aria-hidden>
                    <Tag size={13} strokeWidth={2} />
                  </span>
                  <span className="catalogue__suggest-label">
                    {s.kind === 'category' ? 'Catégorie' : 'Marque'} · {s.label}
                  </span>
                  <span className="catalogue__suggest-count">{s.count}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
