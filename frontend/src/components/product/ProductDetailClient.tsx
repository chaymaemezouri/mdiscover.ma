'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ProductListItem } from '@/lib/api';
import { ProductReviews } from '@/components/reviews/ProductReviews';
import { ProductBuyBox } from './ProductBuyBox';
import { ProductDetailsTabs } from './ProductDetailsTabs';
import { ProductGallery } from './ProductGallery';
import { ProductSimilar } from './ProductSimilar';
import type { ProductDetail } from './product-types';
import { isNewArrival } from '@/lib/product';

type Props = {
  product: ProductDetail;
  similar: ProductListItem[];
};

export function ProductDetailClient({ product, similar }: Props) {
  const [favorited, setFavorited] = useState(false);
  const hasPromo = product.promoPrice != null;
  const isNew = isNewArrival(product);

  useEffect(() => {
    if (!getToken()) return;
    void api<Array<{ product: { id: string } }>>('/favorites')
      .then((favorites) => {
        setFavorited(favorites.some((f) => f.product.id === product.id));
      })
      .catch(() => {
        /* ignore */
      });
  }, [product.id]);

  return (
    <div className="pd has-mobile-action-bar">
      <div className="pd-shell">
        <nav className="pd-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span className="pd-crumbs__sep" aria-hidden>
            /
          </span>
          <Link href="/catalogue">Catalogue</Link>
          {product.category?.slugFr ? (
            <>
              <span className="pd-crumbs__sep" aria-hidden>
                /
              </span>
              <Link
                href={`/catalogue?category=${encodeURIComponent(product.category.slugFr)}`}
              >
                {product.category.nameFr}
              </Link>
            </>
          ) : null}
          <span className="pd-crumbs__sep" aria-hidden>
            /
          </span>
          <span className="pd-crumbs__current">{product.nameFr}</span>
        </nav>

        <div className="pd-hero">
          <ProductGallery
            images={product.images ?? []}
            productName={product.nameFr}
            hasPromo={hasPromo}
            isNew={isNew}
          />
          <div className="pd-buy-col">
            <ProductBuyBox product={product} initialFavorited={favorited} />
          </div>
        </div>

        <ProductDetailsTabs product={product} />

        <div className="pd-reviews" id="avis">
          <ProductReviews
            productId={product.id}
            productSlug={product.slugFr}
            ratingsAvg={product.ratingsAvg}
            ratingsCount={product.ratingsCount}
          />
        </div>

        <ProductSimilar products={similar} />
      </div>
    </div>
  );
}
