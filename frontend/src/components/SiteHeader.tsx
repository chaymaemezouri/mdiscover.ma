'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, formatPrice, getToken, type CartResponse, type SafeUser } from '@/lib/api';
import { SiteLogo } from '@/components/SiteLogo';
import { HOME_CATEGORIES, catalogueCategoryHref } from '@/lib/home-categories';

const MENU_LEFT = [
  { href: '/catalogue', label: 'Catalogue', match: (p: string) => p.startsWith('/catalogue') || p.startsWith('/produits') },
  { href: '/catalogue?promo=true', label: 'Promotions', match: (p: string) => p.includes('promo') },
  { href: '/contact', label: 'Contact', match: (p: string) => p.startsWith('/contact') },
  { href: '/devis', label: 'Devis', match: (p: string) => p.startsWith('/devis') },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="M16.5 16.5 21 21" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.2 8.5h11.6l-.7 10.2a1.6 1.6 0 0 1-1.6 1.5H8.5a1.6 1.6 0 0 1-1.6-1.5L6.2 8.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.5V7.2a3 3 0 0 1 6 0v1.3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <path strokeLinecap="round" d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6z" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return <SiteHeaderInner />;
}

function SiteHeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCurrency, setCartCurrency] = useState('MAD');
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const catsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('lang');
    if (saved === 'en' || saved === 'fr') setLang(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!getToken()) {
      setUser(null);
      setCartCount(0);
      setCartTotal(0);
      return;
    }
    api<SafeUser>('/users/me')
      .then(setUser)
      .catch(() => setUser(null));
    api<CartResponse>('/cart')
      .then((cart) => {
        const count = (cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
        setCartTotal(cart.totals?.total ?? 0);
        setCartCurrency(cart.totals?.currency ?? 'MAD');
      })
      .catch(() => {
        setCartCount(0);
        setCartTotal(0);
      });
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setCatsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!catsOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!catsRef.current?.contains(e.target as Node)) {
        setCatsOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCatsOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [catsOpen]);

  if (pathname.startsWith('/admin')) return null;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche');
  }

  const accountHref = user ? '/compte' : '/connexion';
  const hello = user
    ? `Bonjour, ${user.individualProfile?.firstName || user.email?.split('@')[0] || 'client'}`
    : 'Bonjour, connectez-vous';
  const accountLine = user ? 'Mon compte' : 'Compte & listes';

  return (
    <header className={['site-header', menuOpen ? 'is-menu-open' : ''].filter(Boolean).join(' ')}>
      <div className="announce-bar" aria-hidden={false}>
        <div className="announce-track">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="announce-item">
              Livraison pro · Commandes B2B · Appelez-nous +212 661-52-86-08
              <span className="announce-dot" />
            </span>
          ))}
        </div>
      </div>

      <div className="header-main">
        <Link href="/" className="header-brand" aria-label="MDiscover — Accueil">
          <SiteLogo href={null} height={20} priority />
        </Link>

        <div className="header-search-row">
          <div ref={catsRef} className={`header-cats${catsOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="header-cats-btn"
              aria-label="Catégories"
              aria-expanded={catsOpen}
              aria-haspopup="menu"
              onClick={() => setCatsOpen((v) => !v)}
            >
              <CategoriesIcon />
            </button>
            {catsOpen ? (
              <div className="header-drop-panel header-cats-panel" role="menu">
                {HOME_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slugFr}
                    href={catalogueCategoryHref(cat.slugFr)}
                    role="menuitem"
                  >
                    {cat.nameFr}
                  </Link>
                ))}
                <Link href="/catalogue" className="header-drop-all" role="menuitem">
                  Voir tout le catalogue
                </Link>
              </div>
            ) : null}
          </div>

          <form className="header-search" onSubmit={onSearch} role="search">
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
            />
            <button type="submit" className="header-search-btn">
              <SearchIcon />
              <span>Rechercher</span>
            </button>
          </form>
        </div>

        <div className="header-utils">
          <div className="header-lang" role="group" aria-label="Langue">
            <button
              type="button"
              className={lang === 'fr' ? 'is-active' : ''}
              aria-pressed={lang === 'fr'}
              onClick={() => setLang('fr')}
            >
              FR
            </button>
            <span aria-hidden>/</span>
            <button
              type="button"
              className={lang === 'en' ? 'is-active' : ''}
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>

          <Link href={accountHref} className="header-account">
            <UserIcon />
            <span className="header-account-text">
              <small>{hello}</small>
              <strong>{accountLine}</strong>
            </span>
          </Link>

          <Link href="/panier" className="header-cart">
            <span className="header-cart-icon">
              <BagIcon />
              <span className="header-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            </span>
            <span className="header-cart-text">
              <small>Panier</small>
              <strong>{formatPrice(cartTotal, cartCurrency)}</strong>
            </span>
          </Link>

          <button
            type="button"
            className="header-burger"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className="header-menu">
        <nav className="header-menu-left" aria-label="Navigation principale">
          {MENU_LEFT.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`header-menu-link${item.match(pathname) ? ' is-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="header-menu-right" aria-label="Collections">
          <Link href="/categories" className="header-menu-hot">
            <BoltIcon />
            Toutes les collections
          </Link>
          <span className="header-menu-sep" aria-hidden />
          <Link href="/favoris" className="header-menu-link">
            Favoris
          </Link>
        </nav>
      </div>

      {menuOpen ? (
        <nav className="header-mobile" aria-label="Menu mobile">
          <form className="header-mobile-search" onSubmit={onSearch} role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher"
            />
            <button type="submit">OK</button>
          </form>
          {MENU_LEFT.map((item) => (
            <Link key={item.href + item.label} href={item.href.replace('?promo=true', '')}>
              {item.label}
            </Link>
          ))}
          <Link href="/categories">Toutes les collections</Link>
          <Link href="/favoris">Favoris</Link>
          <Link href={accountHref}>{accountLine}</Link>
          <Link href="/panier">Panier ({cartCount})</Link>
        </nav>
      ) : null}
    </header>
  );
}
