'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { catalogueCategoryHref } from '@/lib/home-categories';
import { DOCK_CATEGORIES } from '@/lib/home-nav';

export function CategoryDock() {
  const reduce = useReducedMotion();

  return (
    <motion.nav
      aria-label="Catégories rapides"
      className="relative z-20 shrink-0 bg-transparent px-4 pb-4 pt-0 md:px-6 md:pb-4"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto max-w-[1540px]">
        <div className="glass-panel flex gap-0 overflow-x-auto rounded-[18px] scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-6 md:overflow-visible">
          {DOCK_CATEGORIES.map((cat) => (
            <Link
              key={cat.slugFr}
              href={catalogueCategoryHref(cat.slugFr)}
              className="group relative flex min-w-[10.5rem] snap-start items-center gap-2.5 border-r border-[var(--glass-border)] px-3 py-2.5 transition last:border-r-0 hover:bg-[rgba(63, 107, 84,0.10)] md:min-w-0"
            >
              <span className="text-[10px] font-bold tracking-wide text-[var(--primary)]/55">
                {cat.n}
              </span>
              <span className="relative h-8 w-8 overflow-hidden rounded-md bg-[var(--background-soft)]/80">
                <Image
                  src={cat.imageUrl}
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover transition duration-300 group-hover:scale-110"
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text)]">
                {cat.nameFr}
              </span>
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white transition group-hover:translate-x-0.5">
                <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
              <span
                className="absolute inset-x-3 bottom-0 h-0.5 origin-left scale-x-0 bg-[var(--brand-green)] transition group-hover:scale-x-100"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
