'use client';

import { useEffect, useState, type ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Percent,
  Settings,
  Star,
  Store,
  Tag,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { clearAuth, type SafeUser } from '@/lib/api';
import { RequireAuth } from '@/components/RequireAuth';
import { SiteLogo } from '@/components/SiteLogo';
import './admin.css';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  match?: (pathname: string, tab: string | null) => boolean;
};

const MAIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/commandes', label: 'Commandes', icon: ClipboardList },
  { href: '/admin/paiements', label: 'Paiements', icon: Wallet },
  { href: '/admin/devis', label: 'Devis', icon: FileText },
  { href: '/admin/contact', label: 'Contact', icon: Mail },
];

const CATALOG_NAV: NavItem[] = [
  {
    href: '/admin/produits',
    label: 'Produits',
    icon: Package,
    match: (pathname, tab) =>
      pathname.startsWith('/admin/produits') &&
      !pathname.includes('/categorie') &&
      tab !== 'categories',
  },
  {
    href: '/admin/produits?tab=categories',
    label: 'Catégories',
    icon: FolderTree,
    match: (pathname, tab) =>
      pathname.includes('/categorie') ||
      (pathname.startsWith('/admin/produits') && tab === 'categories'),
  },
  { href: '/admin/marques', label: 'Marques', icon: Tag },
  { href: '/admin/promos', label: 'Promos', icon: Percent },
];

const MANAGE_NAV: NavItem[] = [
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/contenu', label: 'Avis', icon: Star },
];

const ALL_NAV = [...MAIN_NAV, ...CATALOG_NAV, ...MANAGE_NAV];

function isActive(item: NavItem, pathname: string, tab: string | null) {
  if (item.match) return item.match(pathname, tab);
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href.split('?')[0]);
}

function titleForPath(pathname: string, tab: string | null) {
  if (pathname.startsWith('/admin/reglages')) return 'Réglages';
  if (pathname.startsWith('/admin/contact')) return 'Messages contact';
  if (pathname.startsWith('/admin/marques')) return 'Marques';
  if (pathname.startsWith('/admin/promos')) return 'Promos';
  if (pathname.includes('/produits/nouveau')) return 'Nouveau produit';
  if (pathname.includes('/produits/categorie/nouveau')) return 'Nouvelle catégorie';
  if (/\/admin\/produits\/categorie\/[^/]+$/.test(pathname)) return 'Détail catégorie';
  if (/\/admin\/produits\/[^/]+$/.test(pathname)) return 'Fiche produit';
  if (/\/admin\/devis\/[^/]+$/.test(pathname)) return 'Détail devis';
  if (/\/admin\/commandes\/[^/]+$/.test(pathname)) return 'Détail commande';
  if (/\/admin\/paiements\/[^/]+$/.test(pathname)) return 'Détail paiement';
  if (/\/admin\/clients\/[^/]+$/.test(pathname)) return 'Fiche client';
  const hit = [...ALL_NAV].reverse().find((item) => isActive(item, pathname, tab));
  return hit?.label ?? 'Administration';
}

function NavGroup({
  label,
  items,
  pathname,
  tab,
  onNavigate,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
  tab: string | null;
  onNavigate: () => void;
}) {
  return (
    <div className="ad-side__group">
      {label ? <p className="ad-side__label">{label}</p> : null}
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item, pathname, tab);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`ad-side__link${active ? ' is-active' : ''}`}
            onClick={onNavigate}
          >
            <Icon size={15} strokeWidth={1.75} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AdminChrome({
  user,
  children,
}: {
  user: SafeUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const tab = search.get('tab');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('md_admin_sidebar');
    if (saved === 'collapsed') setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(
        'md_admin_sidebar',
        next ? 'collapsed' : 'expanded',
      );
      return next;
    });
  }

  return (
    <div
      className={`ad-shell${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-nav-open' : ''}`}
    >
      {mobileOpen ? (
        <button
          type="button"
          className="ad-overlay"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="ad-rail">
        <aside className="ad-side">
          <div className="ad-side__head">
            <span className="ad-side__mark" aria-hidden>
              D
            </span>
            <SiteLogo href="/" height={22} className="ad-side__logo" />
            <button
              type="button"
              className="ad-side__toggle"
              aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
              onClick={toggleCollapsed}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          <nav className="ad-side__nav" aria-label="Admin">
            <NavGroup
              items={MAIN_NAV}
              pathname={pathname}
              tab={tab}
              onNavigate={() => setMobileOpen(false)}
            />
            <NavGroup
              label="Catalogue"
              items={CATALOG_NAV}
              pathname={pathname}
              tab={tab}
              onNavigate={() => setMobileOpen(false)}
            />
            <NavGroup
              label="Gestion"
              items={MANAGE_NAV}
              pathname={pathname}
              tab={tab}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>
        </aside>
      </div>

      <div className="ad-main">
        <header className="ad-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <button
              type="button"
              className="ad-top__menu"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileOpen(true)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <p className="ad-top__crumb">{titleForPath(pathname, tab)}</p>
          </div>
          <div className="ad-top__actions">
            <Link
              href="/"
              className="ad-top__icon"
              title="Voir la boutique"
              aria-label="Voir la boutique"
            >
              <Store size={16} strokeWidth={1.7} aria-hidden />
            </Link>
            <Link
              href="/admin/reglages"
              className={`ad-top__icon${pathname.startsWith('/admin/reglages') ? ' is-active' : ''}`}
              title="Réglages"
              aria-label="Réglages"
            >
              <Settings size={16} strokeWidth={1.7} aria-hidden />
            </Link>
            <Link
              href="/compte"
              className="ad-top__icon"
              title={`Profil · ${user.email}`}
              aria-label="Profil"
            >
              <User size={16} strokeWidth={1.7} aria-hidden />
            </Link>
            <button
              type="button"
              className="ad-top__icon"
              title="Déconnexion"
              aria-label="Déconnexion"
              onClick={() => {
                clearAuth();
                window.location.href = '/connexion?next=/admin';
              }}
            >
              <LogOut size={16} strokeWidth={1.7} aria-hidden />
            </button>
          </div>
        </header>
        <div className="ad-body">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth roles={['ADMIN', 'DEVELOPER']} next="/admin">
      {(user) => (
        <Suspense fallback={<div className="ad-loading">Chargement…</div>}>
          <AdminChrome user={user}>{children}</AdminChrome>
        </Suspense>
      )}
    </RequireAuth>
  );
}
