import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { HOME_CATEGORIES, catalogueCategoryHref } from '@/lib/home-categories';

export function HomeCategoriesSection() {
  return (
    <section
      aria-labelledby="home-categories-title"
      className="relative z-0 bg-[#F3F6F9] pt-[118px] pb-8 md:pt-[130px] md:pb-10 lg:pt-[142px] lg:pb-12"
    >
      <div className="home-container">
        <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
          <div>
            <h2
              id="home-categories-title"
              className="font-[family-name:var(--font-title)] text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.1] font-medium tracking-[-0.02em] text-[var(--text)]"
            >
              Nos catégories
            </h2>
          </div>
          <Link
            href="/categories"
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--text)]"
          >
            Tout voir
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-3 lg:grid-cols-8 lg:overflow-visible">
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat.slugFr}
              href={catalogueCategoryHref(cat.slugFr)}
              className="group flex min-w-[118px] snap-start flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background-soft)] transition hover:-translate-y-0.5 hover:border-[rgba(15, 39, 68),0.28)] hover:shadow-[0_10px_24px_rgba(15, 39, 68),0.07)] md:min-w-0"
            >
              <div className="relative h-[88px] overflow-hidden bg-white md:h-[96px]">
                <Image
                  src={cat.imageUrl}
                  alt={cat.imageAlt}
                  fill
                  sizes="140px"
                  className="object-cover transition duration-400 group-hover:scale-[1.05]"
                />
              </div>
              <div className="flex items-center justify-between gap-1 px-2.5 py-2.5">
                <h3 className="truncate text-[12px] font-semibold text-[var(--text)] md:text-[13px]">
                  {cat.nameFr}
                </h3>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--primary)] opacity-60 transition group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
