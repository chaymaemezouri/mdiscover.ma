'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { SiteLogo } from '@/components/SiteLogo';
import { SearchBar } from '@/components/home/SearchBar';
import { MobileMenu } from '@/components/home/MobileMenu';
import {
  catalogueCategoryHref,
} from '@/lib/home-categories';
import { usePublicCategories } from '@/lib/public-categories';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/lib/home-nav';
import { formatPrice, hasSession } from '@/lib/api';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useShopOptional } from '@/components/shop/ShopProvider';

const NAV_LINKS = [...PRIMARY_NAV, ...SECONDARY_NAV].filter(
  (item) => item.label !== 'Catégories',
);

export function MainNavbar() {
  return (
    <Suspense fallback={<MainNavbarShell />}>
      <MainNavbarWithParams />
    </Suspense>
  );
}

function MainNavbarWithParams() {
  const searchParams = useSearchParams();
  return (
    <MainNavbarShell
      sort={searchParams.get('sort')}
      category={searchParams.get('category')}
    />
  );
}

function MainNavbarShell({
  sort,
  category,
}: {
  sort?: string | null;
  category?: string | null;
}) {
  const pathname = usePathname();
  const shop = useShopOptional();
  const isHome = pathname === '/';
  const user = shop?.user ?? null;
  const [localCartCount, setLocalCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCurrency, setCartCurrency] = useState('MAD');
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const catsRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const cartLinkRef = useRef<HTMLAnchorElement>(null);
  const favLinkRef = useRef<HTMLAnchorElement>(null);

  const cartCount = shop?.cartCount ?? localCartCount;
  const favoritesCount = shop?.favoritesCount ?? 0;
  const { navItems: navCategories, loading: categoriesLoading } = usePublicCategories();

  useEffect(() => {
    if (cartLinkRef.current && shop) {
      shop.cartIconRef.current = cartLinkRef.current;
    }
    if (favLinkRef.current && shop) {
      shop.favIconRef.current = favLinkRef.current;
    }
  });

  useEffect(() => {
    function onScroll() {
      const threshold =
        isHome && window.matchMedia('(max-width: 767px)').matches ? 160 : 18;
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [isHome]);

  useEffect(() => {
    if (!hasSession()) {
      setLocalCartCount(0);
      setCartTotal(0);
      return;
    }

    if (shop) {
      void shop.refreshCart();
      void shop.refreshFavorites();
    }

    api<{
      items?: Array<{ quantity: number }>;
      totals?: { total?: number; currency?: string };
    }>('/cart')
      .then((cart) => {
        const count = (cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
        if (!shop) setLocalCartCount(count);
        setCartTotal(cart.totals?.total ?? 0);
        setCartCurrency(cart.totals?.currency ?? 'MAD');
      })
      .catch(() => {
        if (!shop) setLocalCartCount(0);
        setCartTotal(0);
      });
  }, [shop]);

  useEffect(() => {
    if (!catsOpen && !searchOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (catsOpen && catsRef.current && !catsRef.current.contains(target)) {
        setCatsOpen(false);
      }
      if (
        searchOpen &&
        searchPanelRef.current &&
        !searchPanelRef.current.contains(target) &&
        searchBtnRef.current &&
        !searchBtnRef.current.contains(target)
      ) {
        setSearchOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setCatsOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [catsOpen, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const input = searchPanelRef.current?.querySelector<HTMLInputElement>('input');
    window.setTimeout(() => input?.focus(), 40);
  }, [searchOpen]);

  function isNavActive(item: (typeof NAV_LINKS)[number]) {
    if (item.label === 'Nouveautés') {
      return pathname.startsWith('/catalogue') && sort === 'new';
    }
    return item.match?.(pathname) ?? false;
  }

  const accountHref = user ? '/compte' : '/connexion';
  const accountLine = user ? 'Mon compte' : 'Compte';
  const catsActive =
    pathname.startsWith('/categories') ||
    (pathname.startsWith('/catalogue') && Boolean(category));

  return (
    <>
      <div
        className={cn('home-main-nav relative z-30', scrolled && 'is-scrolled')}
      >
        <div className="home-main-nav__inner">
          <div className="home-container bg-transparent">
            <div
              className={cn(
                'home-main-nav__row relative flex items-center justify-between gap-3 bg-transparent transition-[height] duration-250 ease-out sm:gap-4',
                scrolled ? 'h-11 sm:h-12' : 'h-12 sm:h-14',
              )}
            >
              <Link href="/" className="relative z-10 shrink-0" aria-label="MDiscover — Accueil">
                <SiteLogo href={null} height={scrolled ? 22 : 24} priority />
              </Link>

              <nav
                className="absolute inset-x-0 hidden items-center justify-center gap-0.5 lg:flex xl:gap-1.5"
                aria-label="Navigation principale"
              >
                <div ref={catsRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setCatsOpen((v) => !v);
                      setSearchOpen(false);
                    }}
                    aria-expanded={catsOpen}
                    aria-haspopup="menu"
                    className={cn(
                      'relative inline-flex min-h-11 items-center gap-1 rounded-full px-4 py-[9px] text-[15px] font-medium text-[var(--text-primary)] transition duration-150 hover:text-[var(--primary)]',
                      (catsOpen || catsActive) &&
                        'bg-[rgba(15,39,68,0.10)] font-semibold text-[#0F2744]',
                    )}
                  >
                    Catégories
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition', catsOpen && 'rotate-180')}
                      aria-hidden
                    />
                    {catsActive && !catsOpen ? (
                      <span
                        className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-[var(--brand-green)]"
                        aria-hidden
                      />
                    ) : null}
                  </button>

                  {catsOpen ? (
                    <div
                      role="menu"
                      className="absolute left-1/2 top-[calc(100%+0.55rem)] z-50 w-[min(92vw,18rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[rgba(15,39,68,0.1)] bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,39,68,0.14)] backdrop-blur-md"
                    >
                      {categoriesLoading ? (
                        <p className="px-3.5 py-2.5 text-sm text-[var(--text-muted)]">
                          Chargement…
                        </p>
                      ) : navCategories.length === 0 ? (
                        <p className="px-3.5 py-2.5 text-sm text-[var(--text-muted)]">
                          Aucune catégorie
                        </p>
                      ) : (
                        navCategories.map((cat) => (
                          <Link
                            key={cat.slugFr}
                            href={catalogueCategoryHref(cat.slugFr)}
                            role="menuitem"
                            className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--brand-green-soft)] hover:text-[var(--primary)]"
                            onClick={() => setCatsOpen(false)}
                          >
                            {cat.nameFr}
                          </Link>
                        ))
                      )}
                      <Link
                        href="/catalogue"
                        role="menuitem"
                        className="mt-1 block rounded-xl border-t border-[var(--border)] px-3.5 py-2.5 text-sm font-bold text-[var(--primary)]"
                        onClick={() => setCatsOpen(false)}
                      >
                        Voir tout le catalogue
                      </Link>
                    </div>
                  ) : null}
                </div>

                {NAV_LINKS.map((item) => {
                  const active = isNavActive(item);
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        'relative inline-flex min-h-11 items-center rounded-full px-4 py-[9px] text-[15px] font-medium text-[var(--text-primary)] transition duration-150 hover:text-[var(--primary)]',
                        active && 'bg-[rgba(15,39,68,0.10)] font-semibold text-[#0F2744]',
                      )}
                    >
                      {item.label}
                      {active ? (
                        <span
                          className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-[var(--brand-green)]"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>

              <div className="home-nav-tools relative z-10 flex shrink-0 items-center gap-0.5 sm:gap-1">
                <div className="home-nav-tools__cluster flex items-center">
                <button
                  ref={searchBtnRef}
                  type="button"
                  className={cn(
                    'inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[rgba(11,41,72,0.06)]',
                    searchOpen && 'bg-[rgba(11,41,72,0.08)]',
                  )}
                  aria-label={searchOpen ? 'Fermer la recherche' : 'Ouvrir la recherche'}
                  aria-expanded={searchOpen}
                  onClick={() => {
                    setSearchOpen((v) => !v);
                    setCatsOpen(false);
                  }}
                >
                  {searchOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>

                <Link
                  ref={favLinkRef}
                  href="/favoris"
                  data-nav-favorites
                  className={cn(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[rgba(11,41,72,0.06)]',
                    shop && shop.favPulse > 0 && 'home-nav-icon--pulse',
                  )}
                  key={shop ? `fav-${shop.favPulse}` : 'fav'}
                  aria-label={
                    favoritesCount > 0
                      ? `Favoris, ${favoritesCount} article${favoritesCount > 1 ? 's' : ''}`
                      : 'Favoris'
                  }
                >
                  <Heart className="h-5 w-5" />
                  {favoritesCount > 0 ? (
                    <span
                      key={favoritesCount}
                      className="home-nav-badge home-nav-badge--fav"
                    >
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </span>
                  ) : null}
                </Link>

                <Link
                  ref={cartLinkRef}
                  href="/panier"
                  data-nav-cart
                  className={cn(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[rgba(11,41,72,0.06)]',
                    shop && shop.cartPulse > 0 && 'home-nav-icon--pulse',
                  )}
                  key={shop ? `cart-${shop.cartPulse}` : 'cart'}
                  aria-label={`Panier, ${formatPrice(cartTotal, cartCurrency)}`}
                >
                  <ShoppingBag className="h-5 w-5" aria-hidden />
                  {cartCount > 0 ? (
                    <span
                      key={cartCount}
                      className="home-nav-badge home-nav-badge--cart"
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  ) : null}
                </Link>

                <button
                  type="button"
                  className="home-nav-tools__menu inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] hover:bg-[rgba(11,41,72,0.06)] lg:hidden"
                  aria-label="Ouvrir le menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                </div>

                <Link
                  href={accountHref}
                  className={cn(
                    'home-nav-login ml-1.5 hidden items-center justify-center rounded-full bg-[#0B2948] font-semibold whitespace-nowrap !text-white transition hover:bg-[#081f38] hover:!text-white lg:inline-flex',
                    scrolled && 'home-nav-login--compact',
                  )}
                >
                  <span className="text-white">{user ? 'Mon compte' : 'Connexion'}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            searchOpen ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0',
          )}
          aria-hidden={!searchOpen}
        >
          <div className="border-t border-[rgba(15,39,68,0.06)] bg-transparent">
            <div
              ref={searchPanelRef}
              className="home-container flex items-center gap-3 py-3.5 sm:py-4"
            >
              <div className="w-full">
                <SearchBar compact className="max-w-none shadow-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        accountHref={accountHref}
        accountLabel={accountLine}
        cartCount={cartCount}
        categories={navCategories}
        categoriesLoading={categoriesLoading}
      />
    </>
  );
}
