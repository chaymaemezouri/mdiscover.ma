'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowUpRight, Heart, PackageOpen, ShoppingCart, Star } from 'lucide-react';
import { api, clearAuth, formatPrice, getToken, mediaUrl, type ProductListItem } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useShopOptional } from '@/components/shop/ShopProvider';
import { useToast } from '@/components/shop/ToastProvider';
import { flyToNav } from '@/lib/fly-to-nav';
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

type OffersProductCardProps = {
  product: ProductListItem;
  featured?: boolean;
  isNew?: boolean;
  priority?: boolean;
  /** Variante plus compacte pour la grille catalogue. */
  compact?: boolean;
  initialFavorited?: boolean;
  onFavoriteChange?: (productId: string, favorited: boolean) => void;
};

export function OffersProductCard({
  product,
  featured = false,
  isNew = false,
  priority = false,
  compact = false,
  initialFavorited = false,
  onFavoriteChange,
}: OffersProductCardProps) {
  const shop = useShopOptional();
  const toast = useToast();
  const image =
    product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
  const src = mediaUrl(image);
  const hasPromo = product.promoPrice != null;
  const showNew = isNew || isNewArrival(product);
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

  const metaParts = [product.packaging, product.brand?.name].filter(Boolean);
  const secondary = metaParts.join(' · ');

  const [favorited, setFavorited] = useState(initialFavorited);
  const [favLoading, setFavLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartDone, setCartDone] = useState(false);
  const [wishPop, setWishPop] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const wishRef = useRef<HTMLButtonElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const cartAnimLock = useRef(false);

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  async function toggleFavorite(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!getToken()) {
      window.location.href = `/connexion?next=${encodeURIComponent(href)}`;
      return;
    }
    if (favLoading) return;
    setFavLoading(true);
    const wasFavorited = favorited;

    const redirectToLogin = () => {
      clearAuth();
      window.location.href = `/connexion?next=${encodeURIComponent(href)}`;
    };

    const isAuthError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      return /401|403|unauthorized|unauthorised|jwt|token|session|forbidden/i.test(
        msg,
      );
    };

    try {
      let next = !wasFavorited;
      try {
        const res = await api<{ favorited?: boolean }>('/favorites/toggle', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id }),
        });
        next = Boolean(res?.favorited ?? !wasFavorited);
      } catch (firstErr) {
        if (isAuthError(firstErr)) {
          redirectToLogin();
          return;
        }
        try {
          if (wasFavorited) {
            await api(`/favorites/${product.id}`, { method: 'DELETE' });
            next = false;
          } else {
            await api('/favorites', {
              method: 'POST',
              body: JSON.stringify({ productId: product.id }),
            });
            next = true;
          }
        } catch (secondErr) {
          if (isAuthError(secondErr)) {
            redirectToLogin();
            return;
          }
          throw secondErr;
        }
      }

      setFavorited(next);
      onFavoriteChange?.(product.id, next);
      if (next && !wasFavorited) {
        setWishPop(true);
        window.setTimeout(() => setWishPop(false), 420);
        const from = wishRef.current?.getBoundingClientRect();
        const to = shop?.favIconRef.current?.getBoundingClientRect();
        if (from && to) {
          void flyToNav({ from, to, kind: 'favorite' });
        }
        shop?.bumpFavorites(1);
        toast.push(`${product.nameFr} ajouté aux favoris`);
      } else if (!next && wasFavorited) {
        shop?.bumpFavorites(-1);
        toast.push('Retiré des favoris', 'info');
      }
    } catch (err) {
      if (isAuthError(err)) {
        redirectToLogin();
        return;
      }
      const msg = err instanceof Error ? err.message : '';
      toast.push(
        msg && msg.length < 80 ? msg : 'Impossible d’ajouter aux favoris',
        'error',
      );
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
    if (cartLoading || cartAnimLock.current) return;
    cartAnimLock.current = true;
    setCartLoading(true);
    try {
      await api('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      setCartDone(true);
      window.setTimeout(() => setCartDone(false), 1100);

      const from =
        mediaRef.current?.getBoundingClientRect() ??
        ctaRef.current?.getBoundingClientRect();
      const to = shop?.cartIconRef.current?.getBoundingClientRect();
      if (from && to) {
        void flyToNav({ from, to, kind: 'cart', imageUrl: src });
      }
      shop?.bumpCart(1);
      toast.push(`${product.nameFr} ajouté au panier`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/401|403|unauthorized|jwt|token|session/i.test(msg)) {
        clearAuth();
        window.location.href = '/connexion?next=/panier';
        return;
      }
      toast.push(
        msg && msg.length < 80 ? msg : 'Impossible d’ajouter au panier',
        'error',
      );
    } finally {
      setCartLoading(false);
      window.setTimeout(() => {
        cartAnimLock.current = false;
      }, 500);
    }
  }

  return (
    <article
      className={cn(
        'home-offer-tile',
        featured && 'home-offer-tile--featured',
        compact && 'home-offer-tile--compact',
      )}
    >
      <div className="home-offer-tile__media" ref={mediaRef}>
        <Link href={href} className="home-offer-tile__media-link" tabIndex={-1}>
          {src && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={product.nameFr}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span
              className="home-offer-tile__fallback"
              aria-label={`Image indisponible pour ${product.nameFr}`}
            >
              <PackageOpen size={30} strokeWidth={1.4} aria-hidden />
            </span>
          )}
        </Link>

        <div className="home-offer-tile__badges">
          {showNew ? (
            <span className="home-offer-tile__badge home-offer-tile__badge--new">
              Nouveau
            </span>
          ) : null}
          {hasPromo ? (
            <span className="home-offer-tile__badge">Promo</span>
          ) : null}
          {discount != null ? (
            <span className="home-offer-tile__badge">-{discount}%</span>
          ) : featured ? (
            <span className="home-offer-tile__badge">Offre</span>
          ) : null}
        </div>

      </div>

      <button
        ref={wishRef}
        type="button"
        className={cn(
          'home-offer-tile__wish',
          favorited && 'is-active',
          wishPop && 'is-pop',
        )}
        aria-label={
          favorited
            ? `Retirer ${product.nameFr} des favoris`
            : `Ajouter ${product.nameFr} aux favoris`
        }
        aria-pressed={favorited}
        disabled={favLoading}
        onClick={toggleFavorite}
      >
        <Heart
          strokeWidth={2}
          className={favorited ? 'fill-current' : undefined}
        />
      </button>

      <div className="home-offer-tile__panel">
        <p className="home-offer-tile__cat">
          {product.category?.nameFr ?? 'Produit'}
        </p>

        <h3 className="home-offer-tile__title">
          <Link href={href}>{product.nameFr}</Link>
        </h3>

        {secondary ? (
          <p className="home-offer-tile__meta">{secondary}</p>
        ) : (
          <p className="home-offer-tile__meta home-offer-tile__meta--empty" aria-hidden>
            &nbsp;
          </p>
        )}

        {hasRating ? (
          <div
            className="home-offer-tile__rating"
            aria-label={`Note moyenne : ${accessibleRatingLabel} sur 5, basée sur ${ratingsCount} avis`}
          >
            <Star size={compact ? 13 : 14} fill="currentColor" aria-hidden />
            <strong>{ratingLabel}</strong>
            <span>({ratingsCount})</span>
          </div>
        ) : null}

        <div className="home-offer-tile__row">
          <div className="home-offer-tile__price">
            <span className="home-offer-tile__current">
              {formatPrice(price, product.currency)}
            </span>
            {hasPromo ? (
              <span className="home-offer-tile__old">
                {formatPrice(product.price, product.currency)}
              </span>
            ) : null}
          </div>

          <div className="home-offer-tile__actions">
            <button
              ref={ctaRef}
              type="button"
              className={cn('home-offer-tile__cta', cartDone && 'is-active')}
              aria-label={
                cartDone
                  ? `${product.nameFr} ajouté au panier`
                  : `Ajouter ${product.nameFr} au panier`
              }
              disabled={cartLoading}
              onClick={addToCart}
            >
              <ShoppingCart strokeWidth={1.9} aria-hidden />
              <span>{cartDone ? 'Ajouté ✓' : 'Ajouter'}</span>
            </button>
            <Link
              href={href}
              className="home-offer-tile__view"
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
