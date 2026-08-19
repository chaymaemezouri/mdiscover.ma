'use client';

import { ShopProvider } from '@/components/shop/ShopProvider';
import { ToastProvider } from '@/components/shop/ToastProvider';
import { ScrollToTop } from '@/components/ScrollToTop';
import { LoginPrompt } from '@/components/LoginPrompt';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ShopProvider>
      <ToastProvider>
        <ScrollToTop />
        <LoginPrompt />
        {children}
      </ToastProvider>
    </ShopProvider>
  );
}
