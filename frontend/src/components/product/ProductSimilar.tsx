'use client';

import { useEffect, useState } from 'react';
import { api, getToken, type ProductListItem } from '@/lib/api';
import { OffersProductCard } from '@/components/home/OffersProductCard';

type Props = {
  products: ProductListItem[];
};

export function ProductSimilar({ products }: Props) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!getToken() || products.length === 0) return;
    void api<Array<{ product: ProductListItem }>>('/favorites')
      .then((favorites) => {
        setFavoriteIds(new Set(favorites.map((f) => f.product.id)));
      })
      .catch(() => {
        /* ignore */
      });
  }, [products]);

  if (products.length === 0) return null;

  return (
    <section className="pd-section" aria-labelledby="pd-similar-title">
      <h2 id="pd-similar-title" className="pd-section__title">
        Vous pourriez aussi aimer
      </h2>
      <div className="pd-similar__grid">
        {products.map((product) => (
          <OffersProductCard
            key={product.id}
            product={product}
            compact
            initialFavorited={favoriteIds.has(product.id)}
            onFavoriteChange={(id, favorited) => {
              setFavoriteIds((prev) => {
                const next = new Set(prev);
                if (favorited) next.add(id);
                else next.delete(id);
                return next;
              });
            }}
          />
        ))}
      </div>
    </section>
  );
}
