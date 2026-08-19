'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

type SearchBarProps = {
  className?: string;
  compact?: boolean;
};

export function SearchBar({ className, compact = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche');
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={cn(
        'search-bar mx-auto flex w-full max-w-[440px] items-stretch gap-0 overflow-hidden rounded-full border border-[rgba(15,39,68,0.18)] bg-transparent p-0',
        'shadow-none backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]',
        'focus-within:border-[#0F2744] focus-within:shadow-[0_0_0_3px_rgba(15,39,68,0.08)]',
        compact ? 'h-10' : 'h-[44px] sm:h-[46px] lg:h-11',
        className,
      )}
    >
      <label className="sr-only" htmlFor="home-search">
        Rechercher un produit
      </label>
      <input
        id="home-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={isMobile || compact ? 'Rechercher…' : 'Rechercher un produit...'}
        className={cn(
          'h-full min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent font-[family-name:var(--font-body)] font-medium text-[#0B1220] outline-none',
          'placeholder:text-[rgba(11,18,32,0.45)]',
          '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
          compact ? 'px-4 text-[13px]' : 'py-0 pl-4 pr-3 text-sm sm:pl-5 lg:text-[14px]',
        )}
      />
      <button
        type="submit"
        className={cn(
          'group m-0 flex h-full shrink-0 items-center justify-center rounded-none border-0 bg-[#0F2744] p-0 text-white transition-colors duration-200 ease-out hover:bg-[#0A1B30]',
          compact
            ? 'w-10 min-w-10'
            : 'w-11 min-w-11 sm:w-12 sm:min-w-12',
        )}
        aria-label="Rechercher"
      >
        <Search
          className={cn(
            'text-white transition-transform duration-200 ease-out group-hover:scale-[1.04]',
            compact ? 'h-4 w-4' : 'h-[18px] w-[18px]',
          )}
          strokeWidth={2.2}
          aria-hidden
        />
      </button>
    </form>
  );
}
