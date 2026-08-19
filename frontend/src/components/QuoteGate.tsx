'use client';

import type { ReactNode } from 'react';
import { useShopOptional } from '@/components/shop/ShopProvider';

export function QuoteGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const shop = useShopOptional();
  if (!shop?.userReady) return <>{children}</>;
  return <>{shop.canUseQuotes ? children : fallback}</>;
}
