'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  ChevronRight,
  Heart,
  Info,
  LayoutGrid,
  Mail,
  Package,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { SiteLogo } from '@/components/SiteLogo';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/lib/home-nav';
import { catalogueCategoryHref } from '@/lib/home-categories';
import type { PublicCategoryNavItem } from '@/lib/public-categories';
import './mobile-menu.css';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  accountHref: string;
  accountLabel: string;
  cartCount: number;
  categories: PublicCategoryNavItem[];
  categoriesLoading?: boolean;
};

const MENU_LINKS = [...PRIMARY_NAV, ...SECONDARY_NAV].filter(
  (item) => item.label !== 'Catégories',
);

function linkIcon(label: string) {
  if (label === 'Nouveautés') return Sparkles;
  if (label === 'Contact') return Mail;
  if (label === 'À propos') return Info;
  return LayoutGrid;
}

export function MobileMenu({
  open,
  onClose,
  accountHref,
  accountLabel,
  cartCount,
  categories,
  categoriesLoading = false,
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

  const accountText = accountLabel === 'Compte' ? 'Connexion' : accountLabel;

  return (
    <div className="mm" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="mm__backdrop"
        aria-label="Fermer le menu"
        onClick={onClose}
      />
      <aside className="mm__panel">
        <header className="mm__head">
          <div onClick={onClose}>
            <SiteLogo href="/" height={26} className="mm__logo" />
          </div>
          <button
            type="button"
            className="mm__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <nav className="mm__nav" aria-label="Navigation mobile">
          <section className="mm__section">
            <p className="mm__label">Catalogue</p>
            <div className="mm__list">
              {categoriesLoading ? (
                <p className="mm__empty">Chargement…</p>
              ) : categories.length === 0 ? (
                <p className="mm__empty">Aucune catégorie</p>
              ) : (
                categories.map((cat) => (
                  <Link
                    key={cat.slugFr}
                    href={catalogueCategoryHref(cat.slugFr)}
                    onClick={onClose}
                    className="mm__link"
                  >
                    <span>{cat.nameFr}</span>
                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
                  </Link>
                ))
              )}
            </div>
            <Link
              href="/catalogue"
              onClick={onClose}
              className="mm__cta"
            >
              <Package size={16} strokeWidth={1.9} aria-hidden />
              Voir tout le catalogue
            </Link>
          </section>

          <section className="mm__section">
            <p className="mm__label">Découvrir</p>
            <div className="mm__list">
              {MENU_LINKS.map((item) => {
                const Icon = linkIcon(item.label);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={onClose}
                    className="mm__link"
                  >
                    <span className="mm__link-main">
                      <Icon size={16} strokeWidth={1.8} aria-hidden />
                      {item.label}
                    </span>
                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mm__section mm__section--account">
            <p className="mm__label">Compte</p>
            <div className="mm__list">
              <Link href={accountHref} onClick={onClose} className="mm__link">
                <span className="mm__link-main">
                  <UserRound size={16} strokeWidth={1.8} aria-hidden />
                  {accountText}
                </span>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
              </Link>
              <Link href="/favoris" onClick={onClose} className="mm__link">
                <span className="mm__link-main">
                  <Heart size={16} strokeWidth={1.8} aria-hidden />
                  Favoris
                </span>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
              </Link>
              <Link href="/panier" onClick={onClose} className="mm__link">
                <span className="mm__link-main">
                  <ShoppingBag size={16} strokeWidth={1.8} aria-hidden />
                  Panier
                  {cartCount > 0 ? (
                    <span className="mm__badge">{cartCount}</span>
                  ) : null}
                </span>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
              </Link>
            </div>
          </section>
        </nav>
      </aside>
    </div>
  );
}
