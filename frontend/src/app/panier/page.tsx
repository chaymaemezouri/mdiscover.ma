'use client';

import Link from 'next/link';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { ArrowLeft, Check, LockKeyhole, ShoppingBag, Trash2 } from 'lucide-react';
import {
  api,
  formatPrice,
  getToken,
  mediaUrl,
  type CartResponse,
} from '@/lib/api';
import { useShopOptional } from '@/components/shop/ShopProvider';
import { useToast } from '@/components/shop/ToastProvider';
import './cart.css';

type CartItem = CartResponse['items'][number];

const REMOVE_ANIMATION_MS = 220;

function itemImageUrl(item: CartItem) {
  const raw =
    item.product.image?.url ??
    item.product.images?.find((entry) => entry.isPrimary)?.url ??
    item.product.images?.[0]?.url;
  return mediaUrl(raw) ?? null;
}

function maxQuantity(item: CartItem) {
  const stock = item.variant?.stockQty ?? item.product.stockQty ?? 0;
  const threshold = item.product.hybridThresholdQty;
  if (item.product.purchaseMode === 'HYBRID' && threshold) {
    return Math.max(1, Math.min(stock, threshold));
  }
  return Math.max(1, stock);
}

function CartItemMedia({ item }: { item: CartItem }) {
  const [failed, setFailed] = useState(false);
  const src = itemImageUrl(item);

  return (
    <Link
      href={`/produits/${item.product.slugFr}`}
      className="cart-row__media"
      aria-label={`Voir ${item.product.nameFr}`}
      tabIndex={-1}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="cart-row__media-fallback" aria-hidden>
          Discover
        </span>
      )}
    </Link>
  );
}

type CartRowProps = {
  item: CartItem;
  currency: string;
  busy: boolean;
  removing: boolean;
  onQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
};

const CartRow = memo(function CartRow({
  item,
  currency,
  busy,
  removing,
  onQuantity,
  onRemove,
}: CartRowProps) {
  const max = maxQuantity(item);
  const lineTotal = item.lineTotal ?? Number(item.unitPrice ?? 0) * item.quantity;
  const atMax = item.quantity >= max;
  const secondary =
    item.variant?.nameFr ?? item.product.packaging ?? `Réf. ${item.product.sku}`;

  return (
    <article className={`cart-row${removing ? ' is-removing' : ''}`}>
      <CartItemMedia item={item} />

      <div className="cart-row__info">
        <Link href={`/produits/${item.product.slugFr}`}>{item.product.nameFr}</Link>
        <span>{secondary}</span>
        <small>{formatPrice(item.unitPrice ?? 0, currency)} / unité</small>
      </div>

      <div className="cart-row__control">
        <div
          className="cart-qty"
          role="group"
          aria-label={`Quantité pour ${item.product.nameFr}`}
        >
          <button
            type="button"
            aria-label="Diminuer la quantité"
            disabled={busy || removing || item.quantity <= 1}
            onClick={() => onQuantity(item.id, item.quantity - 1)}
          >
            −
          </button>
          <span key={item.quantity} aria-live="polite">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            disabled={busy || removing || atMax}
            onClick={() => onQuantity(item.id, item.quantity + 1)}
          >
            +
          </button>
        </div>
        {atMax ? <small className="cart-row__stock">Stock maximum atteint</small> : null}
      </div>

      <strong className="cart-row__total">
        {formatPrice(lineTotal, currency)}
      </strong>

      <button
        type="button"
        className="cart-row__remove"
        aria-label={`Retirer ${item.product.nameFr} du panier`}
        disabled={busy || removing}
        onClick={() => onRemove(item.id)}
      >
        <Trash2 size={17} aria-hidden />
      </button>
    </article>
  );
});

export default function PanierPage() {
  const shop = useShopOptional();
  const setCartCount = shop?.setCartCount;
  const toast = useToast();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const cartRef = useRef<CartResponse | null>(null);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const syncCartCount = useCallback(
    (next: CartResponse) => {
      const count = next.items.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount?.(count);
    },
    [setCartCount],
  );

  const loadCart = useCallback(async () => {
    if (!getToken()) {
      window.location.href = '/connexion?next=/panier';
      return;
    }
    try {
      const next = await api<CartResponse>('/cart');
      setCart(next);
      syncCartCount(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur panier');
    } finally {
      setLoading(false);
    }
  }, [syncCartCount]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const items = cart?.items ?? [];

  const setBusy = useCallback((itemId: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity < 1) return;
      const snapshot = cartRef.current;

      setCart((current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((entry) =>
            entry.id === itemId
              ? {
                  ...entry,
                  quantity,
                  lineTotal: Number(entry.unitPrice ?? 0) * quantity,
                }
              : entry,
          ),
        };
      });

      setBusy(itemId, true);

      void (async () => {
        try {
          const next = await api<CartResponse>(`/cart/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
          });
          setCart(next);
          syncCartCount(next);
        } catch (e) {
          if (snapshot) setCart(snapshot);
          toast.push(
            e instanceof Error ? e.message : 'Quantité impossible à modifier',
            'error',
          );
        } finally {
          setBusy(itemId, false);
        }
      })();
    },
    [setBusy, syncCartCount, toast],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setRemovingId(itemId);
      setBusy(itemId, true);

      void (async () => {
        await new Promise((resolve) =>
          window.setTimeout(resolve, REMOVE_ANIMATION_MS),
        );
        try {
          const next = await api<CartResponse>(`/cart/items/${itemId}`, {
            method: 'DELETE',
          });
          setCart(next);
          syncCartCount(next);
          toast.push('Produit retiré du panier', 'info');
        } catch (e) {
          toast.push(
            e instanceof Error ? e.message : 'Suppression impossible',
            'error',
          );
        } finally {
          setRemovingId(null);
          setBusy(itemId, false);
        }
      })();
    },
    [setBusy, syncCartCount, toast],
  );

  async function applyPromo(e: FormEvent) {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code || promoBusy) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const next = await api<CartResponse>('/cart/promo', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setCart(next);
      setPromoCode('');
      toast.push('Code promotionnel appliqué');
    } catch (err) {
      const message =
        err instanceof Error && err.message.length < 90
          ? err.message
          : 'Code promotionnel invalide';
      setPromoError(message);
    } finally {
      setPromoBusy(false);
    }
  }

  async function removePromo() {
    if (promoBusy) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const next = await api<CartResponse>('/cart/promo', { method: 'DELETE' });
      setCart(next);
      toast.push('Code promotionnel retiré', 'info');
    } catch (err) {
      setPromoError(
        err instanceof Error ? err.message : 'Modification impossible',
      );
    } finally {
      setPromoBusy(false);
    }
  }

  const crumbs = (
    <nav className="cart-crumbs" aria-label="Fil d’Ariane">
      <Link href="/">Accueil</Link>
      <span className="cart-crumbs__sep" aria-hidden>
        /
      </span>
      <span className="cart-crumbs__current">Panier</span>
    </nav>
  );

  if (loading) {
    return (
      <main className="cart-page" aria-busy="true">
        <div className="cart-shell">
          {crumbs}
          <div className="cart-head">
            <div className="cart-skeleton cart-skeleton--title" />
          </div>
          <div className="cart-layout" aria-hidden>
            <section className="cart-products">
              <div className="cart-products__body">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="cart-row cart-row--skeleton">
                    <div className="cart-row__media cart-skeleton" />
                    <div className="cart-row__info">
                      <span className="cart-skeleton" />
                      <span className="cart-skeleton" />
                    </div>
                    <div className="cart-row__control">
                      <span className="cart-skeleton" />
                    </div>
                    <div className="cart-row__total">
                      <span className="cart-skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <aside className="cart-summary cart-summary--skeleton">
              <div className="cart-skeleton cart-skeleton--promo" />
              <div className="cart-skeleton cart-skeleton--line" />
              <div className="cart-skeleton cart-skeleton--line" />
              <div className="cart-skeleton cart-skeleton--line" />
              <div className="cart-skeleton cart-skeleton--total" />
              <div className="cart-skeleton cart-skeleton--cta" />
            </aside>
          </div>
          <span className="sr-only">Chargement du panier…</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="cart-page">
        <div className="cart-shell">
          {crumbs}
          <section className="cart-state">
            <h1>Panier indisponible</h1>
            <p>{error}</p>
            <button type="button" onClick={() => void loadCart()}>
              Réessayer
            </button>
          </section>
        </div>
      </main>
    );
  }

  const currency = cart?.totals?.currency ?? cart?.currency ?? 'MAD';
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totals = cart?.totals;

  return (
    <main className={`cart-page${items.length > 0 ? ' has-mobile-action-bar' : ''}`}>
      <div className="cart-shell">
        {crumbs}

        <header className="cart-head">
          <h1>
            <span className="cart-head__title-wide">Votre panier</span>
            <span className="cart-head__title-compact">Mon panier</span>
          </h1>
          {itemCount > 0 ? (
            <span>
              {itemCount} article{itemCount > 1 ? 's' : ''}
            </span>
          ) : null}
        </header>

        {items.length === 0 ? (
          <section className="cart-empty">
            <span className="cart-empty__icon">
              <ShoppingBag size={28} aria-hidden />
            </span>
            <h2>Votre panier est vide</h2>
            <p>
              Ajoutez des produits depuis notre catalogue pour commencer votre
              commande.
            </p>
            <Link href="/catalogue">Explorer le catalogue</Link>
          </section>
        ) : (
          <>
            <div className="cart-layout">
              <section className="cart-products" aria-label="Produits du panier">
                <div className="cart-products__head" aria-hidden>
                  <span className="cart-products__head-product">Produit</span>
                  <span>Quantité</span>
                  <span>Total</span>
                  <span />
                </div>

                <div className="cart-products__body">
                  {items.map((item) => (
                    <CartRow
                      key={item.id}
                      item={item}
                      currency={currency}
                      busy={busyIds.has(item.id)}
                      removing={removingId === item.id}
                      onQuantity={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </section>

              <aside className="cart-summary" aria-labelledby="cart-summary-title">
                <h2 id="cart-summary-title">Résumé de la commande</h2>

                <div className="cart-promo-block">
                  <span className="cart-promo-block__label">Code promo</span>

                  {cart?.promoCode ? (
                    <div className="cart-promo-applied">
                      <div>
                        <span>
                          <Check size={14} aria-hidden />
                          Code appliqué
                        </span>
                        <strong>{cart.promoCode.code}</strong>
                        {totals && totals.discount > 0 ? (
                          <em>−{formatPrice(totals.discount, currency)}</em>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={promoBusy}
                        onClick={() => void removePromo()}
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <form className="cart-promo" onSubmit={applyPromo} noValidate>
                      <label className="sr-only" htmlFor="cart-promo-code">
                        Code promotionnel
                      </label>
                      <input
                        id="cart-promo-code"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value);
                          if (promoError) setPromoError(null);
                        }}
                        placeholder="Code promotionnel"
                        autoComplete="off"
                        aria-invalid={promoError ? true : undefined}
                        aria-describedby={promoError ? 'cart-promo-error' : undefined}
                      />
                      <button
                        type="submit"
                        disabled={promoBusy || !promoCode.trim()}
                      >
                        {promoBusy ? '…' : 'Appliquer'}
                      </button>
                    </form>
                  )}

                  {promoError ? (
                    <p className="cart-promo-error" id="cart-promo-error" role="alert">
                      {promoError}
                    </p>
                  ) : null}
                </div>

                {totals ? (
                  <dl className="cart-totals">
                    <div>
                      <dt>Sous-total</dt>
                      <dd>{formatPrice(totals.subtotal, currency)}</dd>
                    </div>
                    {totals.discount > 0 ? (
                      <div className="cart-totals__discount">
                        <dt>Réduction</dt>
                        <dd>−{formatPrice(totals.discount, currency)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>TVA</dt>
                      <dd>{formatPrice(totals.taxAmount, currency)}</dd>
                    </div>
                    <div className="cart-totals__grand">
                      <dt>Total</dt>
                      <dd>{formatPrice(totals.total, currency)}</dd>
                    </div>
                  </dl>
                ) : null}

                <p className="cart-summary__note">
                  <LockKeyhole size={16} aria-hidden />
                  Paiement sécurisé. Les frais de livraison se règlent avec le
                  livreur.
                </p>

                <Link href="/commande" className="cart-checkout">
                  Passer commande
                </Link>
                {shop?.canUseQuotes ? (
                  <Link
                    href="/devis?fromCart=true"
                    className="cart-continue"
                    style={{ marginTop: '0.75rem', justifyContent: 'center' }}
                  >
                    Demander un devis pour ce panier
                  </Link>
                ) : null}
              </aside>
            </div>

            <Link href="/catalogue" className="cart-continue">
              <ArrowLeft size={16} aria-hidden />
              Continuer mes achats
            </Link>

            <div className="cart-sticky" role="region" aria-label="Commander">
              <div className="cart-sticky__total">
                <span>Total</span>
                <strong>{formatPrice(totals?.total ?? 0, currency)}</strong>
              </div>
              <Link href="/commande" className="cart-sticky__cta">
                Commander
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
