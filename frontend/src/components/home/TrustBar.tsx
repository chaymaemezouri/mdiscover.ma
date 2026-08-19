'use client';

import { BriefcaseBusiness, Headphones, ShieldCheck, Truck } from 'lucide-react';
import { USP_ITEMS, type UspItem } from '@/lib/home-nav';

const ICONS: Record<UspItem['icon'], typeof Truck> = {
  truck: Truck,
  briefcase: BriefcaseBusiness,
  shield: ShieldCheck,
  headset: Headphones,
};

export function TrustBar() {
  return (
    <section
      aria-label="Avantages MDiscover"
      className="border-y border-[rgba(15, 39, 68),0.10)] bg-white"
    >
      <div className="home-container flex gap-0 overflow-x-auto scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:h-[74px] lg:grid-cols-4 lg:overflow-visible">
        {USP_ITEMS.map((item, i) => {
          const Icon = ICONS[item.icon];
          return (
            <div
              key={item.title}
              className={`flex min-w-[220px] snap-start items-center gap-3 px-1 py-4 sm:min-w-[240px] lg:min-w-0 lg:px-5 lg:py-0 ${
                i > 0 ? 'lg:border-l lg:border-[rgba(15, 39, 68),0.10)]' : ''
              }`}
            >
              <span className="inline-flex shrink-0 text-[var(--primary)]">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="truncate text-[12px] leading-snug text-[var(--text-muted)]">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
