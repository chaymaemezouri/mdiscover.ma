'use client';

import { usePathname } from 'next/navigation';
import { MainNavbar } from '@/components/home/MainNavbar';
import { cn } from '@/lib/cn';

export function AppHeader() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return null;

  return (
    <>
      <div
        className={cn(
          'home-hero__nav',
          isHome && 'home-hero__nav--home',
          !isHome && 'home-hero__nav--solid',
        )}
      >
        <MainNavbar />
      </div>
      {isHome ? null : <div className="home-nav-spacer" aria-hidden />}
    </>
  );
}
