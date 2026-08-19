'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  SORT_OPTIONS,
  type CatalogueSort,
} from './catalogue-data';

type CatalogueSortSelectProps = {
  value: CatalogueSort;
  onChange: (value: CatalogueSort) => void;
  id?: string;
  /** Pleine largeur (barre mobile) */
  fullWidth?: boolean;
};

export function CatalogueSortSelect({
  value,
  onChange,
  id,
  fullWidth = false,
}: CatalogueSortSelectProps) {
  const fallbackId = useId();
  const controlId = id ?? fallbackId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      SORT_OPTIONS.findIndex((opt) => opt.value === value),
    ),
  );

  const selected =
    SORT_OPTIONS.find((opt) => opt.value === value) ?? SORT_OPTIONS[0];

  const close = useCallback(() => setOpen(false), []);

  const selectOption = useCallback(
    (next: CatalogueSort) => {
      onChange(next);
      close();
    },
    [close, onChange],
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => Math.min(SORT_OPTIONS.length - 1, i + 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const opt = SORT_OPTIONS[activeIndex];
        if (opt) selectOption(opt.value);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, close, open, selectOption]);

  useEffect(() => {
    const index = SORT_OPTIONS.findIndex((opt) => opt.value === value);
    if (index >= 0) setActiveIndex(index);
  }, [value]);

  return (
    <div
      ref={rootRef}
      className={`catalogue-sort${fullWidth ? ' catalogue-sort--full' : ''}${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        id={controlId}
        className="catalogue-sort__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${controlId}-listbox`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="catalogue-sort__value">{selected.label}</span>
        <ChevronDown
          size={15}
          strokeWidth={2.2}
          aria-hidden
          className="catalogue-sort__chevron"
        />
      </button>

      {open ? (
        <ul
          id={`${controlId}-listbox`}
          className="catalogue-sort__menu"
          role="listbox"
          aria-labelledby={controlId}
        >
          {SORT_OPTIONS.map((opt, index) => {
            const isSelected = opt.value === value;
            const isActive = index === activeIndex;

            return (
              <li key={opt.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`catalogue-sort__option${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected ? (
                    <Check size={14} strokeWidth={2.4} aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
