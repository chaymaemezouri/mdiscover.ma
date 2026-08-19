'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { HOME_CATEGORIES, catalogueCategoryHref } from '@/lib/home-categories';
import { cn } from '@/lib/cn';

const GAP_PX = 18;
/** Défilement automatique très lent (px / seconde). */
const AUTO_SPEED_PX_S = 16;
/** Pause après interaction manuelle. */
const RESUME_AFTER_MS = 4200;

export function HeroCategoriesSlider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const getStep = useCallback(() => {
    const el = trackRef.current;
    if (!el) return 250;
    const card = el.querySelector<HTMLElement>('[data-hero-cat-card]');
    return (card?.offsetWidth ?? 232) + GAP_PX;
  }, []);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 6);
    setCanNext(el.scrollLeft < max - 6);
  }, []);

  const pauseAuto = useCallback((resume = true) => {
    pausedRef.current = true;
    lastTsRef.current = null;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (resume) {
      resumeTimerRef.current = setTimeout(() => {
        pausedRef.current = false;
        lastTsRef.current = null;
      }, RESUME_AFTER_MS);
    }
  }, []);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      const el = trackRef.current;
      if (!el) return;
      pauseAuto();
      el.scrollBy({ left: dir * getStep(), behavior: 'smooth' });
    },
    [getStep, pauseAuto],
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows]);

  // Auto-scroll très lent + boucle, respect prefers-reduced-motion
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const onPointerEnter = () => pauseAuto(false);
    const onPointerLeave = () => {
      pausedRef.current = false;
      lastTsRef.current = null;
    };
    const onFocusIn = () => pauseAuto(false);
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) {
        pausedRef.current = false;
        lastTsRef.current = null;
      }
    };
    const onUserScrollIntent = () => pauseAuto();

    el.addEventListener('pointerenter', onPointerEnter);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    el.addEventListener('wheel', onUserScrollIntent, { passive: true });
    el.addEventListener('touchstart', onUserScrollIntent, { passive: true });

    const tick = (ts: number) => {
      if (!pausedRef.current) {
        if (lastTsRef.current == null) lastTsRef.current = ts;
        const dt = Math.min(48, ts - lastTsRef.current) / 1000;
        lastTsRef.current = ts;

        const max = el.scrollWidth - el.clientWidth;
        if (max > 4) {
          let next = el.scrollLeft + AUTO_SPEED_PX_S * dt;
          if (next >= max - 0.5) {
            next = 0;
          }
          el.scrollLeft = next;
        }
      } else {
        lastTsRef.current = ts;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const onMotionChange = () => {
      if (mq.matches && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    mq.addEventListener('change', onMotionChange);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      el.removeEventListener('pointerenter', onPointerEnter);
      el.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('wheel', onUserScrollIntent);
      el.removeEventListener('touchstart', onUserScrollIntent);
      mq.removeEventListener('change', onMotionChange);
    };
  }, [pauseAuto]);

  const navBtnClass = cn(
    'hidden h-9 w-9 shrink-0 items-center justify-center rounded-full md:inline-flex lg:h-11 lg:w-11',
    'border border-[rgba(15, 39, 68,0.14)] bg-[rgba(255,255,255,0.88)] text-[#0F2744]',
    'shadow-[0_10px_28px_rgba(15, 39, 68,0.12)] backdrop-blur-[14px] [-webkit-backdrop-filter:blur(14px)]',
    'transition duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
    'hover:bg-[#0F2744] hover:text-white',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2744]',
  );

  return (
    <div className="home-container relative z-30">
      <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          disabled={!canPrev}
          aria-label="Catégories précédentes"
          aria-hidden={!canPrev}
          className={cn(navBtnClass, !canPrev && 'invisible pointer-events-none')}
        >
          <ChevronLeft className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2} />
        </button>

        <div
          ref={trackRef}
          role="region"
          aria-label="Catégories en vedette"
          aria-roledescription="carousel"
          tabIndex={0}
          className={cn(
            'flex min-w-0 flex-1 overflow-x-auto',
            'cursor-grab gap-3.5 py-1 active:cursor-grabbing md:gap-4 lg:gap-5',
            'px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat.slugFr}
              data-hero-cat-card
              href={catalogueCategoryHref(cat.slugFr)}
              className={cn(
                'group flex shrink-0 flex-col overflow-hidden rounded-[18px] md:rounded-[20px] lg:rounded-[22px]',
                'h-[172px] w-[min(78vw,280px)]',
                'md:h-[180px] md:w-[215px]',
                'lg:h-[188px] lg:w-[232px]',
                'xl:w-[240px]',
                'border border-[rgba(15,39,68,0.1)] bg-white',
                'shadow-[0_8px_24px_rgba(15,39,68,0.07)]',
                'transition-[transform,box-shadow] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:-translate-y-[3px] hover:shadow-[0_14px_32px_rgba(15,39,68,0.11)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2744]',
              )}
            >
              <div className="relative h-[112px] w-full shrink-0 overflow-hidden md:h-[118px] lg:h-[126px]">
                <Image
                  src={cat.imageUrl}
                  alt={cat.imageAlt}
                  fill
                  sizes="(max-width: 768px) 78vw, (max-width: 1024px) 215px, 240px"
                  className="object-cover object-center [filter:saturate(0.94)_contrast(1.01)] transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                />
              </div>

              <div
                className={cn(
                  'flex min-h-0 flex-1 items-center justify-between gap-1.5',
                  'border-t border-[rgba(15,39,68,0.06)]',
                  'bg-[#F8FAFC] px-3 py-2 pr-2.5 md:px-3.5',
                )}
              >
                <span className="truncate whitespace-nowrap text-[13px] font-semibold text-[#0B1220] md:text-[14px] lg:text-[15px]">
                  {cat.nameFr}
                </span>
                <span
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full md:h-7 md:w-7',
                    'bg-[rgba(15, 39, 68,0.08)] text-[#0F2744]',
                    'transition duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                    'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-[#0F2744] group-hover:text-white',
                  )}
                  aria-hidden
                >
                  <ArrowUpRight className="h-3 w-3 md:h-3.5 md:w-3.5" strokeWidth={2.2} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollByDir(1)}
          disabled={!canNext}
          aria-label="Catégories suivantes"
          aria-hidden={!canNext}
          className={cn(navBtnClass, !canNext && 'invisible pointer-events-none')}
        >
          <ChevronRight className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
