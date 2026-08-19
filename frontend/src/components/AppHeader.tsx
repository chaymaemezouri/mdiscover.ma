'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MainNavbar } from '@/components/home/MainNavbar';
import { cn } from '@/lib/cn';

export function AppHeader() {
  const pathname = usePathname();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    const saved = window.localStorage.getItem('lang');
    if (saved === 'en' || saved === 'fr') setLang(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

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
        <MainNavbar lang={lang} onLang={setLang} />
      </div>
      {isHome ? null : <div className="home-nav-spacer" aria-hidden />}
    </>
  );
}
