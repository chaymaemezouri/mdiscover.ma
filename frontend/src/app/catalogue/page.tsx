import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CatalogueClient } from './CatalogueClient';
import './catalogue.css';

export const metadata: Metadata = {
  title: 'Catalogue',
  description:
    'Explorez notre sélection de produits alimentaires et d’hygiène pensée pour les besoins des professionnels.',
};

function CatalogueFallback() {
  return (
    <div className="catalogue__inner" aria-busy="true">
      <div className="catalogue__skel-line" />
      <div className="catalogue__skel-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="catalogue__skel-card" />
        ))}
      </div>
    </div>
  );
}

export default function CataloguePage() {
  return (
    <div className="catalogue">
      <div className="catalogue__inner">
        <header className="catalogue__header">
          <nav className="catalogue__crumbs" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>/</span>
            <span aria-current="page">Catalogue</span>
          </nav>
          <h1 className="sr-only">Catalogue professionnel DISCOVER</h1>
        </header>

        <Suspense fallback={<CatalogueFallback />}>
          <CatalogueClient />
        </Suspense>
      </div>
    </div>
  );
}
