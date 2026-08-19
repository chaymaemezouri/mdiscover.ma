'use client';

import Link from 'next/link';
import { useState, type MouseEvent } from 'react';
import {
  ArrowUpRight,
  Heart,
  PackageOpen,
  ShoppingCart,
  Star,
} from 'lucide-react';
import { api, formatPrice, getToken, mediaUrl, type ProductListItem } from '@/lib/api';
import { isNewArrival } from '@/lib/product';

function discountPercent(
  price: string | number,
  promoPrice: string | number,
): number | null {
  const base = Number(price);
  const promo = Number(promoPrice);
  if (!base || !promo || promo >= base) return null;
  return Math.max(1, Math.round((1 - promo / base) * 100));
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const image =
    product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
  const src = mediaUrl(image);
  const hasPromo = product.promoPrice != null;
  const showNew = isNewArrival(product);
  const price = hasPromo ? product.promoPrice! : product.price;
  const discount =
    hasPromo && product.promoPrice != null
      ? discountPercent(product.price, product.promoPrice)
      : null;
  const href = `/produits/${product.slugFr}`;
  const ratingsAvg = Number(product.ratingsAvg ?? 0);
  const ratingsCount = product.ratingsCount ?? 0;
  const hasRating =
    ratingsCount > 0 &&
    Number.isFinite(ratingsAvg) &&
    ratingsAvg > 0 &&
    ratingsAvg <= 5;
  const ratingLabel = ratingsAvg.toFixed(1);
  const accessibleRatingLabel = ratingLabel.replace('.', ',');

  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartDone, setCartDone] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  async function toggleFavorite(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getToken()) {
      window.location.href = `/connexion?next=${encodeURIComponent(href)}`;
      return;
    }
    setFavLoading(true);
    try {
      const res = await api<{ favorited?: boolean }>('/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id }),
      });
      setFavorited(Boolean(res?.favorited ?? !favorited));
    } catch {
      try {
        if (favorited) {
          await api(`/favorites/${product.id}`, { method: 'DELETE' });
          setFavorited(false);
        } else {
          await api('/favorites', {
            method: 'POST',
            body: JSON.stringify({ productId: product.id }),
          });
          setFavorited(true);
        }
      } catch {
        /* ignore */
      }
    } finally {
      setFavLoading(false);
    }
  }

  async function addToCart(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getToken()) {
      window.location.href = '/connexion?next=/panier';
      return;
    }
    setCartLoading(true);
    try {
      await api('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      setCartDone(true);
      window.setTimeout(() => setCartDone(false), 1600);
    } catch {
      /* ignore */
    } finally {
      setCartLoading(false);
    }
  }

  return (
    <article className={`ph-product-card${hasPromo ? ' is-promo' : ''}`}>
      <div className="ph-product-media">
        <Link href={href} className="ph-product-media-link" tabIndex={-1}>
          {src && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={product.nameFr}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span
              className="ph-product-fallback"
              aria-label={`Image indisponible pour ${product.nameFr}`}
            >
              <PackageOpen size={30} strokeWidth={1.4} aria-hidden />
            </span>
          )}
        </Link>

        {showNew ? (
          <span className="ph-product-badge ph-product-badge--new">Nouveau</span>
        ) : null}
        {hasPromo ? (
          <span className="ph-product-badge">Promo</span>
        ) : null}
        {discount != null ? (
          <span className="ph-product-badge">-{discount}%</span>
        ) : null}

        <button
          type="button"
          className={`ph-product-wish${favorited ? ' is-active' : ''}`}
          aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={favorited}
          disabled={favLoading}
          onClick={toggleFavorite}
        >
          <Heart strokeWidth={2} className={favorited ? 'fill-current' : undefined} />
        </button>
      </div>

      <div className="ph-product-body">
        <div className="ph-product-meta">
          <p className="ph-product-cat">{product.category?.nameFr ?? 'Produit'}</p>
          {product.brand?.name ? (
            <p className="ph-product-brand">{product.brand.name}</p>
          ) : null}
        </div>

        <h3>
          <Link href={href}>{product.nameFr}</Link>
        </h3>

        {product.packaging ? (
          <p className="ph-product-pack">{product.packaging}</p>
        ) : (
          <p className="ph-product-pack ph-product-pack--empty" aria-hidden>
            &nbsp;
          </p>
        )}

        {hasRating ? (
          <div
            className="ph-product-rating"
            aria-label={`Note moyenne : ${accessibleRatingLabel} sur 5, basée sur ${ratingsCount} avis`}
          >
            <Star size={14} fill="currentColor" aria-hidden />
            <strong>{ratingLabel}</strong>
            <span>({ratingsCount})</span>
          </div>
        ) : null}

        <div className="ph-product-row">
          <div className={`ph-product-price${hasPromo ? ' is-promo' : ''}`}>
            <span className="ph-product-current">
              {formatPrice(price, product.currency)}
            </span>
            {hasPromo ? (
              <span className="ph-product-old">
                {formatPrice(product.price, product.currency)}
              </span>
            ) : null}
          </div>

          <div className="ph-product-actions">
            <button
              type="button"
              className={`ph-product-cart${cartDone ? ' is-active' : ''}`}
              aria-label={cartDone ? 'Ajouté au panier' : 'Ajouter au panier'}
              disabled={cartLoading}
              onClick={addToCart}
            >
              <ShoppingCart strokeWidth={2} />
            </button>
            <Link
              href={href}
              className="ph-product-view"
              aria-label={`Voir ${product.nameFr}`}
            >
              <ArrowUpRight strokeWidth={2.2} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
