'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { HeroCategoriesSlider } from '@/components/home/HeroCategoriesSlider';

/** Section catégories séparée du hero — plus aérée, moins concurrentielle. */
export function HomeCategoriesStrip() {
  return (
    <section
      id="categories-home"
      className="bg-[#F3F6F9] py-10 md:py-12 lg:py-14"
      aria-labelledby="home-cats-heading"
    >
      <div className="home-container mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-[#3F6B54] uppercase">
            Catalogue
          </p>
          <h2
            id="home-cats-heading"
            className="font-[family-name:var(--font-title)] text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-[#0B1220]"
          >
            Nos catégories
          </h2>
        </div>
        <Link
          href="/categories"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2744] transition hover:text-[#3F6B54]"
        >
          Tout voir
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
      <HeroCategoriesSlider />
    </section>
  );
}
