'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SiteLogo } from '@/components/SiteLogo';
import { QuoteGate } from '@/components/QuoteGate';

const cols = [
  {
    title: 'Boutique',
    links: [
      { href: '/catalogue', label: 'Catalogue' },
      { href: '/categories', label: 'Catégories' },
      { href: '/catalogue?promo=true', label: 'Promotions' },
      { href: '/marques', label: 'Marques' },
    ],
  },
  {
    title: 'Services',
    links: [
      { href: '/devis', label: 'Demande de devis' },
      { href: '/contact', label: 'Contact' },
      { href: '/suivi', label: 'Suivi commande' },
      { href: '/a-propos', label: 'À propos' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Informations',
    links: [
      { href: '/legal/cgv', label: 'CGV' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
      { href: '/legal/mentions', label: 'Mentions légales' },
    ],
  },
] as const;

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <SiteLogo height={28} />
          </div>

          <nav className="site-footer__nav" aria-label="Pied de page">
            {cols.map((col) => (
              <div key={col.title} className="site-footer__col">
                <p className="site-footer__col-title">{col.title}</p>
                <ul className="site-footer__list">
                  {col.links.map((link) =>
                    link.href === '/devis' ? (
                      <QuoteGate key={link.href}>
                        <li>
                          <Link href={link.href}>{link.label}</Link>
                        </li>
                      </QuoteGate>
                    ) : (
                      <li key={link.href}>
                        <Link href={link.href}>{link.label}</Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copy">
            © {year} Discover · MDiscover Impex Food
          </p>
          <div className="site-footer__legal">
            <Link href="/legal/cgv">CGV</Link>
            <span aria-hidden>·</span>
            <Link href="/legal/confidentialite">Confidentialité</Link>
            <span aria-hidden>·</span>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
