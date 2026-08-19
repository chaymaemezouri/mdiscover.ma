'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Remonte en haut à chaque changement de route (catalogue, catégories, etc.). */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    requestAnimationFrame(scrollTop);
  }, [pathname]);

  return null;
}
