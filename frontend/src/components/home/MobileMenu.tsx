'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/lib/home-nav';
import { HOME_CATEGORIES, catalogueCategoryHref } from '@/lib/home-categories';
import { SearchBar } from '@/components/home/SearchBar';
import { cn } from '@/lib/cn';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  accountHref: string;
  accountLabel: string;
  cartCount: number;
  lang: 'fr' | 'en';
  onLang: (lang: 'fr' | 'en') => void;
};

const MENU_LINKS = [...PRIMARY_NAV, ...SECONDARY_NAV].filter(
  (item) => item.label !== 'Catégories',
);

export function MobileMenu({
  open,
  onClose,
  accountHref,
  accountLabel,
  cartCount,
  lang,
  onLang,
}: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15, 39, 68,0.28)]"
        aria-label="Fermer le menu"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-[min(100%,22rem)] flex-col bg-[#F3F6F9] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
          <p className="text-sm font-semibold text-[var(--primary)]">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--primary)] hover:bg-[var(--brand-green-soft)]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-[var(--border)] bg-white p-4">
          <SearchBar compact />
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Navigation mobile">
          <p className="px-3 py-2 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
            Catégories
          </p>
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat.slugFr}
              href={catalogueCategoryHref(cat.slugFr)}
              onClick={onClose}
              className="block rounded-lg px-3 py-3 text-sm font-semibold text-[var(--text)] hover:bg-white"
            >
              {cat.nameFr}
            </Link>
          ))}
          <Link
            href="/catalogue"
            onClick={onClose}
            className="block rounded-lg px-3 py-3 text-sm font-bold text-[var(--primary)] hover:bg-white"
          >
            Voir tout le catalogue
          </Link>
          <div className="my-2 border-t border-[var(--border)]" />
          {MENU_LINKS.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={onClose}
              className="block rounded-lg px-3 py-3 text-sm font-semibold text-[var(--text)] hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
          <div className="my-2 border-t border-[var(--border)]" />
          <Link
            href={accountHref}
            onClick={onClose}
            className="block rounded-lg px-3 py-3 text-sm font-semibold text-[var(--text)] hover:bg-white"
          >
            {accountLabel === 'Compte' ? 'Connexion' : accountLabel}
          </Link>
          <Link
            href="/favoris"
            onClick={onClose}
            className="block rounded-lg px-3 py-3 text-sm font-semibold text-[var(--text)] hover:bg-white"
          >
            Favoris
          </Link>
          <Link
            href="/panier"
            onClick={onClose}
            className="block rounded-lg px-3 py-3 text-sm font-semibold text-[var(--text)] hover:bg-white"
          >
            Panier ({cartCount})
          </Link>
          <div className="my-2 border-t border-[var(--border)]" />
          <p className="px-3 py-2 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
            Langue
          </p>
          <div className="flex gap-2 px-3 pb-4">
            {(['fr', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => {
                  onLang(code);
                  onClose();
                }}
                className={cn(
                  'inline-flex h-11 flex-1 items-center justify-center rounded-full border text-sm font-semibold uppercase transition',
                  lang === code
                    ? 'border-[#0F2744] bg-[#0F2744] text-white'
                    : 'border-[rgba(15, 39, 68,0.14)] bg-white text-[#0F2744] hover:bg-[var(--brand-green-soft)]',
                )}
              >
                {code}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
