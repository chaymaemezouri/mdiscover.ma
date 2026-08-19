'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { ArrowUpRight, Heart, ShoppingCart } from 'lucide-react';
import {
  api,
  clearAuth,
  formatPrice,
  getToken,
  mediaUrl,
} from '@/lib/api';
import { useShopOptional } from '@/components/shop/ShopProvider';
import { useToast } from '@/components/shop/ToastProvider';
import { flyToNav } from '@/lib/fly-to-nav';
import type { ProductDetail, ProductDetailVariant } from './product-types';

type Props = {
  product: ProductDetail;
  initialFavorited?: boolean;
};

function unitPrice(
  product: ProductDetail,
  variant: ProductDetailVariant | null,
): number {
  if (variant?.price != null) return Number(variant.price);
  return Number(product.promoPrice ?? product.price);
}

function availableStock(
  product: ProductDetail,
  variant: ProductDetailVariant | null,
): number {
  if (variant) return Math.max(0, variant.stockQty);
  return Math.max(0, product.stockQty);
}

export function ProductBuyBox({ product, initialFavorited = false }: Props) {
  const router = useRouter();
  const shop = useShopOptional();
  const quotesOk = shop?.canUseQuotes ?? true;
  const toast = useToast();
  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive),
    [product.variants],
  );

  const [variantId, setVariantId] = useState<string | null>(
    activeVariants[0]?.id ?? null,
  );
  const selectedVariant =
    activeVariants.find((v) => v.id === variantId) ?? activeVariants[0] ?? null;

  const stock = availableStock(product, selectedVariant);
  const mode = product.purchaseMode;
  const threshold = product.hybridThresholdQty ?? null;
  const hasPromo =
    product.promoPrice != null && selectedVariant?.price == null;
  const price = unitPrice(product, selectedVariant);
  const compareAt =
    hasPromo && product.promoPrice != null ? Number(product.price) : null;
  const discount =
    compareAt != null && compareAt > price
      ? Math.round((1 - price / compareAt) * 100)
      : null;

  const maxCartQty =
    mode === 'HYBRID' && threshold != null
      ? Math.min(stock, threshold)
      : stock;

  const [qty, setQty] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [cartDone, setCartDone] = useState(false);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [favLoading, setFavLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertDone, setAlertDone] = useState(false);

  const primaryCtaRef = useRef<HTMLElement | null>(null);
  const mediaFlyRef = useRef<HTMLDivElement>(null);
  const favRef = useRef<HTMLButtonElement>(null);
  const cartLock = useRef(false);

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, maxCartQty || 1)));
  }, [maxCartQty, variantId]);

  const ratingsAvg = Number(product.ratingsAvg ?? 0);
  const ratingsCount = product.ratingsCount ?? 0;
  const hasRating =
    ratingsCount > 0 &&
    Number.isFinite(ratingsAvg) &&
    ratingsAvg > 0 &&
    ratingsAvg <= 5;

  const isQuoteOnly = mode === 'QUOTE';
  const isOut = !isQuoteOnly && stock <= 0;
  const canAddToCart =
    !isQuoteOnly &&
    stock > 0 &&
    (mode === 'DIRECT' ||
      mode === 'HYBRID') &&
    qty <= maxCartQty;

  const hybridOver =
    mode === 'HYBRID' &&
    threshold != null &&
    qty > threshold;

  const devisHref = useMemo(() => {
    const params = new URLSearchParams({
      productId: product.id,
      slug: product.slugFr,
    });
    if (selectedVariant?.id) params.set('variantId', selectedVariant.id);
    if (qty > 1) params.set('qty', String(qty));
    return `/devis?${params.toString()}`;
  }, [product.id, product.slugFr, selectedVariant?.id, qty]);
  const productHref = `/produits/${product.slugFr}`;
  const imageSrc = mediaUrl(
    selectedVariant?.imageUrl ??
      product.images?.find((i) => i.isPrimary)?.url ??
      product.images?.[0]?.url,
  );

  const stockLabel = useMemo(() => {
    if (isQuoteOnly) return null;
    if (stock <= 0) return { text: 'Rupture de stock', cls: 'is-out' };
    if (stock <= 5)
      return { text: `Plus que ${stock} en stock`, cls: 'is-low' };
    return { text: 'En stock', cls: '' };
  }, [isQuoteOnly, stock]);

  const redirectLogin = useCallback(
    (next: string) => {
      clearAuth();
      window.location.href = `/connexion?next=${encodeURIComponent(next)}`;
    },
    [],
  );

  async function addToCart(opts?: { checkout?: boolean }) {
    if (!getToken()) {
      redirectLogin(opts?.checkout ? '/commande' : '/panier');
      return;
    }
    if (!canAddToCart || cartLoading || buyLoading || cartLock.current || hybridOver)
      return;
    cartLock.current = true;
    if (opts?.checkout) setBuyLoading(true);
    else setCartLoading(true);
    try {
      await api('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          quantity: qty,
          ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
        }),
      });
      shop?.bumpCart(qty);

      if (opts?.checkout) {
        router.push('/commande');
        return;
      }

      setCartDone(true);
      window.setTimeout(() => setCartDone(false), 1400);

      const from =
        mediaFlyRef.current?.getBoundingClientRect() ??
        primaryCtaRef.current?.getBoundingClientRect();
      const to = shop?.cartIconRef.current?.getBoundingClientRect();
      if (from && to) {
        void flyToNav({ from, to, kind: 'cart', imageUrl: imageSrc });
      }
      toast.push(
        qty > 1
          ? `${qty} × ${product.nameFr} ajoutés au panier`
          : `${product.nameFr} ajouté au panier`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/401|403|unauthorized|jwt|token|session/i.test(msg)) {
        redirectLogin(opts?.checkout ? '/commande' : '/panier');
        return;
      }
      toast.push(
        msg && msg.length < 100 ? msg : 'Impossible d’ajouter au panier',
        'error',
      );
    } finally {
      setCartLoading(false);
      setBuyLoading(false);
      window.setTimeout(() => {
        cartLock.current = false;
      }, 400);
    }
  }

  async function toggleFavorite(e: MouseEvent) {
    e.preventDefault();
    if (!getToken()) {
      redirectLogin(productHref);
      return;
    }
    if (favLoading) return;
    setFavLoading(true);
    const was = favorited;
    try {
      let next = !was;
      try {
        const res = await api<{ favorited?: boolean }>('/favorites/toggle', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id }),
        });
        next = Boolean(res?.favorited ?? !was);
      } catch {
        if (was) {
          await api(`/favorites/${product.id}`, { method: 'DELETE' });
          next = false;
        } else {
          await api('/favorites', {
            method: 'POST',
            body: JSON.stringify({ productId: product.id }),
          });
          next = true;
        }
      }
      setFavorited(next);
      if (next && !was) {
        const from = favRef.current?.getBoundingClientRect();
        const to = shop?.favIconRef.current?.getBoundingClientRect();
        if (from && to) void flyToNav({ from, to, kind: 'favorite' });
        shop?.bumpFavorites(1);
        toast.push(`${product.nameFr} ajouté aux favoris`);
      } else if (!next && was) {
        shop?.bumpFavorites(-1);
        toast.push('Retiré des favoris', 'info');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/401|403|unauthorized|jwt|token|session/i.test(msg)) {
        redirectLogin(productHref);
        return;
      }
      toast.push(
        msg && msg.length < 80 ? msg : 'Impossible de mettre à jour les favoris',
        'error',
      );
    } finally {
      setFavLoading(false);
    }
  }

  async function submitAlert(e: FormEvent) {
    e.preventDefault();
    if (!getToken()) {
      redirectLogin(productHref);
      return;
    }
    setAlertLoading(true);
    try {
      await api('/stock-alerts', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          ...(alertEmail.trim() ? { email: alertEmail.trim() } : {}),
        }),
      });
      setAlertDone(true);
      toast.push('Vous serez informé du retour en stock');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/401|403|unauthorized|jwt|token|session/i.test(msg)) {
        redirectLogin(productHref);
        return;
      }
      toast.push(
        msg && msg.length < 100 ? msg : 'Inscription à l’alerte impossible',
        'error',
      );
    } finally {
      setAlertLoading(false);
    }
  }

  function clampQty(next: number) {
    const max = Math.max(1, maxCartQty || 1);
    setQty(Math.min(max, Math.max(1, next)));
  }

  const primaryLabel = cartDone
    ? 'Ajouté ✓'
    : cartLoading
      ? 'Ajout…'
      : 'Ajouter au panier';

  return (
    <>
      <div className="pd-buy" ref={mediaFlyRef}>
        <button
          ref={favRef}
          type="button"
          className={`pd-buy__fav${favorited ? ' is-fav' : ''}`}
          onClick={(e) => void toggleFavorite(e)}
          disabled={favLoading}
          aria-pressed={favorited}
          aria-label={
            favorited
              ? `Retirer ${product.nameFr} des favoris`
              : `Ajouter ${product.nameFr} aux favoris`
          }
        >
          <Heart
            size={18}
            fill={favorited ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        </button>

        <div className="pd-buy__eyebrows">
          <Link
            href={`/catalogue?category=${encodeURIComponent(product.category.slugFr)}`}
            className="pd-buy__category"
          >
            {product.category.nameFr}
          </Link>
          {product.brand?.name ? (
            <Link
              href={`/marques/${product.brand.slugFr}`}
              className="pd-buy__brand"
            >
              {product.brand.name}
            </Link>
          ) : null}
        </div>

        <h1 className="pd-buy__title">{product.nameFr}</h1>

        <div className="pd-buy__meta">
          {hasRating ? (
            <a href="#avis" className="pd-buy__rating">
              <span className="pd-buy__rating-star" aria-hidden>
                ★
              </span>
              <span>{ratingsAvg.toFixed(1).replace('.', ',')}</span>
              <span className="pd-buy__rating-count">
                ({ratingsCount} avis)
              </span>
            </a>
          ) : null}
          <span className="pd-buy__sku">Réf. {product.sku}</span>
        </div>

        {product.descriptionFr?.trim() ? (
          <div className="pd-buy__about">
            <p className="pd-buy__about-label">À propos du produit</p>
            <p className="pd-buy__about-text">{product.descriptionFr.trim()}</p>
          </div>
        ) : null}

        {!isQuoteOnly ? (
          <div className="pd-buy__price-row">
            <span
              className={`pd-buy__price${hasPromo ? ' pd-buy__price--promo' : ''}`}
            >
              {formatPrice(price, product.currency)}
            </span>
            {compareAt != null ? (
              <span className="pd-buy__compare">
                {formatPrice(compareAt, product.currency)}
              </span>
            ) : null}
            {discount ? (
              <span className="pd-buy__discount">−{discount}%</span>
            ) : null}
          </div>
        ) : (
          <div className="pd-buy__price-row">
            <span className="pd-buy__price pd-buy__price--quote">
              Sur devis
            </span>
          </div>
        )}

        {stockLabel ? (
          <div className={`pd-stock ${stockLabel.cls}`.trim()}>
            <span className="pd-stock__dot" aria-hidden />
            {stockLabel.text}
          </div>
        ) : null}

        {activeVariants.length > 0 ? (
          <div className="pd-buy__field-group">
            <p className="pd-buy__label">Conditionnement</p>
            <div className="pd-variants" role="list">
              {activeVariants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="listitem"
                  className={`pd-variant${selectedVariant?.id === v.id ? ' is-active' : ''}`}
                  disabled={v.stockQty <= 0 && mode !== 'QUOTE'}
                  onClick={() => setVariantId(v.id)}
                >
                  {v.nameFr}
                </button>
              ))}
            </div>
          </div>
        ) : product.packaging ? (
          <div className="pd-buy__field-group">
            <p className="pd-buy__label">Conditionnement</p>
            <span className="pd-packaging-chip">{product.packaging}</span>
          </div>
        ) : null}

        {!isQuoteOnly && !isOut ? (
          <div className="pd-buy__field-group">
            <p className="pd-buy__label">Quantité</p>
            <div className="pd-qty" aria-label="Quantité">
              <button
                type="button"
                aria-label="Diminuer"
                disabled={qty <= 1}
                onClick={() => clampQty(qty - 1)}
              >
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button
                type="button"
                aria-label="Augmenter"
                disabled={qty >= maxCartQty}
                onClick={() => clampQty(qty + 1)}
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        {isOut && alertOpen && !alertDone ? (
          <form className="pd-alert-form" onSubmit={submitAlert}>
            <input
              type="email"
              placeholder="Votre e-mail (optionnel)"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              autoComplete="email"
            />
            <button
              type="submit"
              className="pd-btn pd-btn--secondary"
              disabled={alertLoading}
            >
              {alertLoading ? 'Envoi…' : 'Confirmer l’alerte'}
            </button>
          </form>
        ) : null}

        <div className={`pd-actions${!isQuoteOnly && !isOut ? ' pd-actions--split' : ''}`}>
          {isQuoteOnly ? (
            quotesOk ? (
              <Link
                ref={(node) => {
                  primaryCtaRef.current = node;
                }}
                href={devisHref}
                className="pd-btn pd-btn--primary"
              >
                Demander un devis
              </Link>
            ) : (
              <Link
                ref={(node) => {
                  primaryCtaRef.current = node;
                }}
                href="/contact"
                className="pd-btn pd-btn--primary"
              >
                Nous contacter
              </Link>
            )
          ) : isOut ? (
            <>
              <button
                ref={(node) => {
                  primaryCtaRef.current = node;
                }}
                type="button"
                className="pd-btn pd-btn--primary"
                disabled
              >
                Indisponible
              </button>
              {!alertDone ? (
                alertOpen ? (
                  <form className="pd-alert-form" onSubmit={submitAlert}>
                    <input
                      type="email"
                      placeholder="Votre e-mail (optionnel)"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      autoComplete="email"
                    />
                    <button
                      type="submit"
                      className="pd-btn pd-btn--secondary"
                      disabled={alertLoading}
                    >
                      {alertLoading ? 'Envoi…' : 'Confirmer l’alerte'}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="pd-btn pd-btn--secondary"
                    onClick={() => {
                      if (!getToken()) {
                        redirectLogin(productHref);
                        return;
                      }
                      setAlertOpen(true);
                    }}
                  >
                    Être informé
                  </button>
                )
              ) : (
                <p className="pd-hybrid-note">
                  Alerte enregistrée — nous vous préviendrons.
                </p>
              )}
            </>
          ) : (
            <>
              <button
                ref={(node) => {
                  primaryCtaRef.current = node;
                }}
                type="button"
                className={`pd-btn pd-btn--primary pd-btn--cart${cartDone ? ' is-added' : ''}`}
                disabled={!canAddToCart || cartLoading || buyLoading || hybridOver}
                onClick={() => void addToCart()}
                aria-label={primaryLabel}
              >
                <ShoppingCart size={18} aria-hidden />
                <span className="pd-btn__label">{primaryLabel}</span>
              </button>
              <button
                type="button"
                className="pd-btn pd-btn--buy"
                disabled={!canAddToCart || cartLoading || buyLoading || hybridOver}
                onClick={() => void addToCart({ checkout: true })}
              >
                {buyLoading ? 'Redirection…' : 'Acheter'}
              </button>
            </>
          )}
        </div>

        {mode !== 'QUOTE' && quotesOk ? (
          <Link href={devisHref} className="pd-quote-link">
            Demander un devis
            <ArrowUpRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>

      {!isQuoteOnly && !isOut ? (
        <div className="pd-sticky-bar" role="region" aria-label="Actions produit">
          <div className="pd-sticky-bar__price">
            <strong>{formatPrice(price, product.currency)}</strong>
            <span>{product.nameFr}</span>
          </div>
          <div className="pd-sticky-bar__actions">
            <button
              type="button"
              className={`pd-btn pd-btn--primary pd-btn--cart${cartDone ? ' is-added' : ''}`}
              disabled={!canAddToCart || cartLoading || buyLoading || hybridOver}
              onClick={() => void addToCart()}
              aria-label={primaryLabel}
            >
              <ShoppingCart size={16} aria-hidden />
              <span className="pd-btn__label">{primaryLabel}</span>
            </button>
            <button
              type="button"
              className="pd-btn pd-btn--buy"
              disabled={!canAddToCart || cartLoading || buyLoading || hybridOver}
              onClick={() => void addToCart({ checkout: true })}
            >
              {buyLoading ? '…' : 'Acheter'}
            </button>
          </div>
        </div>
      ) : isQuoteOnly ? (
        <div className="pd-sticky-bar" role="region" aria-label="Actions produit">
          <div className="pd-sticky-bar__price">
            <strong>{quotesOk ? 'Sur devis' : 'Professionnels'}</strong>
            <span>{product.nameFr}</span>
          </div>
          <div className="pd-sticky-bar__actions pd-sticky-bar__actions--single">
            <Link
              href={quotesOk ? devisHref : '/contact'}
              className="pd-btn pd-btn--primary"
            >
              {quotesOk ? 'Demander un devis' : 'Nous contacter'}
            </Link>
          </div>
        </div>
      ) : (
        <div className="pd-sticky-bar" role="region" aria-label="Actions produit">
          <div className="pd-sticky-bar__price">
            <strong>Indisponible</strong>
            <span>{product.nameFr}</span>
          </div>
          <div className="pd-sticky-bar__actions pd-sticky-bar__actions--single">
            {!alertDone ? (
              <button
                type="button"
                className="pd-btn pd-btn--primary"
                onClick={() => {
                  if (!getToken()) {
                    redirectLogin(productHref);
                    return;
                  }
                  setAlertOpen(true);
                }}
              >
                {alertOpen ? 'Voir le formulaire' : 'Être informé'}
              </button>
            ) : (
              <span className="pd-sticky-bar__note">Alerte enregistrée</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
