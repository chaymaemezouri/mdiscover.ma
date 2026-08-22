import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { api, type Category } from '@/lib/api';
import { buildCategoryDisplaysWithFallback } from '@/lib/category-display';
import { catalogueCategoryHref } from '@/lib/home-categories';
import './categories.css';

async function getCategories() {
  try {
    return await api<Category[]>('/categories', { auth: false });
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: 'Catégories',
  description: 'Parcourir le catalogue DISCOVER par univers produit.',
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  const tiles = buildCategoryDisplaysWithFallback(categories);

  return (
    <div className="cat-index">
      <div className="cat-index__inner">
        <header className="cat-index__head">
          <PageHeader
            eyebrow="Catalogue"
            title="Catégories"
            subtitle="Parcourez nos univers produits, sélectionnés pour la distribution et la restauration."
          />
        </header>

        {tiles.length > 0 ? (
          <div className="cat-index__grid">
            {tiles.map((cat) => (
              <Link
                key={cat.slugFr}
                href={catalogueCategoryHref(cat.slugFr)}
                className="cat-tile"
              >
                <div className="cat-tile__media">
                  {cat.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.imageUrl} alt={cat.imageAlt} />
                  ) : (
                    <span className="cat-tile__fallback" aria-hidden>
                      {cat.nameFr.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="cat-tile__body">
                  <h2>
                    {cat.nameFr}
                    <ArrowUpRight size={16} aria-hidden />
                  </h2>
                  {cat.descriptionFr ? <p>{cat.descriptionFr}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ opacity: 0.7 }}>Aucune catégorie.</p>
        )}
      </div>
    </div>
  );
}
