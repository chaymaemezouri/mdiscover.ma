'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  getToken,
  hasSession,
  isProAccount,
  subscribeAuth,
  type CartResponse,
  type SafeUser,
} from '@/lib/api';

type ShopContextValue = {
  user: SafeUser | null;
  userReady: boolean;
  canUseQuotes: boolean;
  cartCount: number;
  favoritesCount: number;
  cartPulse: number;
  favPulse: number;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  bumpCart: (delta?: number) => void;
  bumpFavorites: (delta: number) => void;
  setCartCount: (n: number) => void;
  setFavoritesCount: (n: number) => void;
  cartIconRef: React.RefObject<HTMLElement | null>;
  favIconRef: React.RefObject<HTMLElement | null>;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [userReady, setUserReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [cartPulse, setCartPulse] = useState(0);
  const [favPulse, setFavPulse] = useState(0);
  const cartIconRef = useRef<HTMLElement | null>(null);
  const favIconRef = useRef<HTMLElement | null>(null);

  const refreshUser = useCallback(async () => {
    if (!hasSession()) {
      setUser(null);
      setUserReady(true);
      return;
    }
    try {
      const me = await api<SafeUser>('/users/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setUserReady(true);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    if (!getToken()) {
      setCartCount(0);
      return;
    }
    try {
      const cart = await api<CartResponse>('/cart');
      const count = (cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    } catch {
      /* keep previous */
    }
  }, []);

  const refreshFavorites = useCallback(async () => {
    if (!getToken()) {
      setFavoritesCount(0);
      return;
    }
    try {
      const items = await api<Array<{ id: string }>>('/favorites');
      setFavoritesCount(Array.isArray(items) ? items.length : 0);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    void refreshCart();
    void refreshFavorites();
    return subscribeAuth(() => {
      void refreshUser();
      void refreshCart();
      void refreshFavorites();
    });
  }, [refreshUser, refreshCart, refreshFavorites]);

  const bumpCart = useCallback((delta = 1) => {
    setCartCount((c) => Math.max(0, c + delta));
    setCartPulse((p) => p + 1);
  }, []);

  const bumpFavorites = useCallback((delta: number) => {
    setFavoritesCount((c) => Math.max(0, c + delta));
    if (delta > 0) setFavPulse((p) => p + 1);
  }, []);

  const canUseQuotes = !userReady || !user || isProAccount(user);

  const value = useMemo(
    () => ({
      user,
      userReady,
      canUseQuotes,
      cartCount,
      favoritesCount,
      cartPulse,
      favPulse,
      refreshUser,
      refreshCart,
      refreshFavorites,
      bumpCart,
      bumpFavorites,
      setCartCount,
      setFavoritesCount,
      cartIconRef,
      favIconRef,
    }),
    [
      user,
      userReady,
      canUseQuotes,
      cartCount,
      favoritesCount,
      cartPulse,
      favPulse,
      refreshUser,
      refreshCart,
      refreshFavorites,
      bumpCart,
      bumpFavorites,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    throw new Error('useShop must be used within ShopProvider');
  }
  return ctx;
}

export function useShopOptional() {
  return useContext(ShopContext);
}
