import { Phone } from 'lucide-react';
import { TOP_BAR_ITEMS, TOP_BAR_PHONE } from '@/lib/home-nav';

export function TopBar() {
  return (
    <div className="bg-[var(--primary)] text-white">
      <div className="mx-auto flex h-[30px] home-container items-center justify-center gap-3 text-[10px] font-medium tracking-wide md:gap-4 md:text-[11px]">
        <div className="hidden items-center gap-3 md:flex md:gap-3.5">
          {TOP_BAR_ITEMS.map((item, i) => (
            <span key={item} className="inline-flex items-center gap-3 md:gap-4">
              {i > 0 ? (
                <span className="h-1 w-1 rounded-full bg-[var(--brand-green)]" aria-hidden />
              ) : null}
              <span>{item}</span>
            </span>
          ))}
          <span className="h-1 w-1 rounded-full bg-[var(--brand-green)]" aria-hidden />
        </div>
        <a
          href={`tel:${TOP_BAR_PHONE.replace(/\s/g, '')}`}
          className="inline-flex items-center gap-1.5 text-white/95 transition hover:text-white"
        >
          <Phone className="h-3 w-3 opacity-90" aria-hidden />
          <span className="md:hidden">Commandes B2B · {TOP_BAR_PHONE}</span>
          <span className="hidden md:inline">Appelez-nous : {TOP_BAR_PHONE}</span>
        </a>
      </div>
    </div>
  );
}
