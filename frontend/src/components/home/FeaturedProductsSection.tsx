import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import type { ProductListItem } from '@/lib/api';

type FeaturedProductsSectionProps = {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
  items: ProductListItem[];
  emptyMessage: string;
  eyebrow?: string;
};

export function FeaturedProductsSection({
  title,
  subtitle,
  href,
  linkLabel,
  items,
  emptyMessage,
  eyebrow,
}: FeaturedProductsSectionProps) {
  const gridItems = items.slice(0, 8);

  return (
    <section className="bg-[#F3F6F9] py-12 md:py-14 lg:py-16">
      <div className="home-container">
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="max-w-xl">
            {eyebrow ? (
              <p className="mb-2.5 text-[11px] font-semibold tracking-[0.18em] text-[#0F2744] uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-[family-name:var(--font-title)] text-[clamp(1.85rem,3vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.025em] text-[#0B1220]">
              {title}
            </h2>
            <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-[rgba(11,18,32,0.62)]">
              {subtitle}
            </p>
          </div>
          <Link
            href={href}
            className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[rgba(15,39,68,0.16)] bg-white px-5 text-sm font-semibold text-[#0F2744] shadow-[0_6px_18px_rgba(15,39,68,0.06)] transition duration-200 hover:border-[#0F2744] hover:bg-[#0F2744] hover:text-white"
          >
            {linkLabel}
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[rgba(15,39,68,0.18)] bg-white px-6 py-12 text-center text-sm text-[rgba(11,18,32,0.55)]">
            {emptyMessage}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-4 md:gap-5 lg:gap-6">
            {gridItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
