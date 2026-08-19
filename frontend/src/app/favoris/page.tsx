'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  ArrowLeft,
  Heart,
  PackagePlus,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { OffersProductCard } from '@/components/home/OffersProductCard';
import { useShopOptional } from '@/components/shop/ShopProvider';
import { useToast } from '@/components/shop/ToastProvider';
import {
  api,
  clearAuth,
  getToken,
  type ProductListItem,
} from '@/lib/api';
import './favoris.css';

type FavoriteItem = {
  id: string;
  product: ProductListItem;
};

function isAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /401|403|unauthorized|unauthorised|jwt|token|session|forbidden/i.test(
    message,
  );
}

export default function FavorisPage() {
  const shop = useShopOptional();
  const setFavoritesCount = shop?.setFavoritesCount;
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogPanelRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const redirectToLogin = useCallback(() => {
    clearAuth();
    window.location.href = '/connexion?next=/favoris';
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!getToken()) {
      window.location.href = '/connexion?next=/favoris';
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api<FavoriteItem[]>('/favorites');
      const nextItems = Array.isArray(response) ? response : [];
      setItems(nextItems);
      setFavoritesCount?.(nextItems.length);
    } catch (loadError) {
      if (isAuthError(loadError)) {
        redirectToLogin();
        return;
      }
      setError('Impossible de charger vos favoris.');
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin, setFavoritesCount]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (!confirmClear) return;
    cancelRef.current?.focus();
  }, [confirmClear]);

  const handleFavoriteChange = useCallback(
    (productId: string, favorited: boolean) => {
      if (favorited) return;
      setRemovingIds((current) => new Set(current).add(productId));
      window.setTimeout(() => {
        setItems((current) =>
          current.filter((item) => item.product.id !== productId),
        );
        setRemovingIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }, 210);
    },
    [],
  );

  async function addAllToCart() {
    if (bulkAdding) return;
    const available = items.filter((item) => item.product.stockQty > 0);

    if (available.length === 0) {
      toast.push('Aucun produit disponible pour le moment', 'info');
      return;
    }

    setBulkAdding(true);
    const results = await Promise.allSettled(
      available.map((item) =>
        api('/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: item.product.id, quantity: 1 }),
        }),
      ),
    );
    const addedCount = results.filter(
      (result) => result.status === 'fulfilled',
    ).length;
    const firstFailure = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === 'rejected',
    );

    if (firstFailure && isAuthError(firstFailure.reason)) {
      redirectToLogin();
      return;
    }

    if (addedCount > 0) {
      shop?.bumpCart(addedCount);
      const skipped = items.length - addedCount;
      toast.push(
        skipped > 0
          ? `${addedCount} produit${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''}, ${skipped} indisponible${skipped > 1 ? 's' : ''}.`
          : `${addedCount} produit${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} au panier.`,
      );
    } else {
      toast.push('Impossible d’ajouter les produits au panier', 'error');
    }

    setBulkAdding(false);
  }

  async function clearFavorites() {
    if (clearing) return;
    setClearing(true);
    const currentItems = [...items];
    const results = await Promise.allSettled(
      currentItems.map((item) =>
        api(`/favorites/${item.product.id}`, { method: 'DELETE' }),
      ),
    );

    const failedIds = new Set(
      results.flatMap((result, index) =>
        result.status === 'rejected'
          ? [currentItems[index].product.id]
          : [],
      ),
    );
    const firstFailure = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === 'rejected',
    );

    if (firstFailure && isAuthError(firstFailure.reason)) {
      redirectToLogin();
      return;
    }

    setItems((current) =>
      current.filter((item) => failedIds.has(item.product.id)),
    );
    setFavoritesCount?.(failedIds.size);
    setConfirmClear(false);
    setClearing(false);

    if (failedIds.size === 0) {
      toast.push('Tous les favoris ont été retirés', 'info');
    } else {
      toast.push(
        `${currentItems.length - failedIds.size} favori${currentItems.length - failedIds.size > 1 ? 's' : ''} retiré${currentItems.length - failedIds.size > 1 ? 's' : ''}. Certains éléments n’ont pas pu être supprimés.`,
        'error',
      );
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !clearing) {
      setConfirmClear(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = dialogPanelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled)',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const productCount = `${items.length} produit${items.length > 1 ? 's' : ''}`;
  const countLabel = `${productCount} sauvegardé${items.length > 1 ? 's' : ''}`;

  return (
    <main className={`favorites-page${!loading && !error && items.length > 0 ? ' has-mobile-action-bar' : ''}`}>
      <div className="favorites-shell">
        <nav className="favorites-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Favoris</span>
        </nav>

        <header className="favorites-header">
          <div className="favorites-header__copy">
            <div className="favorites-title-row">
              <h1>Mes favoris</h1>
              {!loading && !error ? (
                <span>
                  <span className="favorites-count-wide">{countLabel}</span>
                  <span className="favorites-count-compact">{productCount}</span>
                </span>
              ) : null}
            </div>
          </div>

          {!loading && !error && items.length > 0 ? (
            <div className="favorites-actions">
              <button
                type="button"
                className="favorites-add-all"
                disabled={bulkAdding}
                onClick={() => void addAllToCart()}
              >
                <ShoppingCart size={18} aria-hidden />
                <span>
                  {bulkAdding ? 'Ajout en cours…' : 'Ajouter tout au panier'}
                </span>
              </button>
              <button
                type="button"
                className="favorites-clear"
                onClick={() => setConfirmClear(true)}
              >
                Tout supprimer
              </button>
            </div>
          ) : null}
        </header>

        {loading ? (
          <section aria-busy="true" aria-label="Chargement des favoris">
            <div className="favorites-grid favorites-grid--skeleton" aria-hidden>
              {Array.from({ length: 8 }, (_, index) => (
                <div className="favorites-skeleton" key={index}>
                  <span className="favorites-skeleton__media" />
                  <span className="favorites-skeleton__line favorites-skeleton__line--short" />
                  <span className="favorites-skeleton__line" />
                  <span className="favorites-skeleton__line favorites-skeleton__line--price" />
                </div>
              ))}
            </div>
            <span className="favorites-sr-only">Chargement des favoris…</span>
          </section>
        ) : error ? (
          <section className="favorites-state" role="alert">
            <span className="favorites-state__icon">
              <X size={25} aria-hidden />
            </span>
            <h2>Impossible de charger vos favoris.</h2>
            <p>Une erreur est survenue. Vous pouvez réessayer maintenant.</p>
            <button type="button" onClick={() => void loadFavorites()}>
              Réessayer
            </button>
          </section>
        ) : items.length === 0 ? (
          <section className="favorites-state">
            <span className="favorites-state__icon favorites-state__icon--heart">
              <Heart size={27} strokeWidth={1.7} aria-hidden />
            </span>
            <h2>Aucun favori pour le moment</h2>
            <p>
              Enregistrez les produits qui vous intéressent pour les retrouver
              facilement ici.
            </p>
            <Link href="/catalogue">
              <PackagePlus size={18} aria-hidden />
              Explorer le catalogue
            </Link>
          </section>
        ) : (
          <section className="favorites-grid" aria-label="Produits sauvegardés">
            {items.map((favorite) => (
              <div
                className={`favorites-card${removingIds.has(favorite.product.id) ? ' is-removing' : ''}`}
                key={favorite.id}
              >
                <OffersProductCard
                  product={favorite.product}
                  compact
                  initialFavorited
                  onFavoriteChange={handleFavoriteChange}
                />
              </div>
            ))}
          </section>
        )}

        {!loading && !error && items.length > 0 ? (
          <Link href="/catalogue" className="favorites-continue">
            <ArrowLeft size={16} aria-hidden />
            Continuer mes achats
          </Link>
        ) : null}
      </div>

      {confirmClear ? (
        <div
          className="favorites-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorites-dialog-title"
          aria-describedby="favorites-dialog-description"
          onKeyDown={handleDialogKeyDown}
        >
          <button
            type="button"
            className="favorites-dialog__backdrop"
            aria-label="Fermer la confirmation"
            disabled={clearing}
            onClick={() => setConfirmClear(false)}
          />
          <div ref={dialogPanelRef} className="favorites-dialog__panel">
            <span className="favorites-dialog__icon">
              <Trash2 size={21} aria-hidden />
            </span>
            <h2 id="favorites-dialog-title">
              Retirer tous les produits des favoris ?
            </h2>
            <p id="favorites-dialog-description">
              Cette action retirera les {items.length} produits sauvegardés de
              votre liste.
            </p>
            <div className="favorites-dialog__actions">
              <button
                ref={cancelRef}
                type="button"
                disabled={clearing}
                onClick={() => setConfirmClear(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="is-danger"
                disabled={clearing}
                onClick={() => void clearFavorites()}
              >
                {clearing ? 'Suppression…' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="favorites-mobile-bar" role="region" aria-label="Actions favoris">
          <button
            type="button"
            className="favorites-add-all"
            disabled={bulkAdding}
            onClick={() => void addAllToCart()}
          >
            <ShoppingCart size={18} aria-hidden />
            <span>
              {bulkAdding ? 'Ajout en cours…' : 'Ajouter tout au panier'}
            </span>
          </button>
          <button
            type="button"
            className="favorites-clear"
            onClick={() => setConfirmClear(true)}
          >
            Tout supprimer
          </button>
        </div>
      ) : null}
    </main>
  );
}
