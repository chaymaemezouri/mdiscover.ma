'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { type CategoryDisplay } from '@/lib/category-display';
import { useHomeSpotlightCategories } from '@/lib/public-categories';
import { cn } from '@/lib/cn';

const EASE = [0.22, 1, 0.36, 1] as const;
const TRANSITION_S = 0.46;
/** Pause entre chaque catégorie. */
const AUTOPLAY_MS = 3800;
/** Le carrousel boucle : les deux flèches restent donc toujours actives. */
const LOOP: boolean = true;

type SpotlightCategory = CategoryDisplay;

function wrapOffset(index: number, active: number, total: number) {
  let d = index - active;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

function padIndex(n: number) {
  return String(n).padStart(2, '0');
}

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setBp('mobile');
      else if (w < 1024) setBp('tablet');
      else setBp('desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}

type SlideTier = {
  w: number;
  h: number;
  scale: number;
  opacity: number;
  y: number;
};

type Layout = {
  gap: number;
  /** Gap plus serré entre active et cartes adjacentes (±1). */
  nearGap: number;
  visible: number;
  tiers: [SlideTier, SlideTier, SlideTier, SlideTier];
  /** Bande visible des cartes extrêmes coupées (px). */
  edgePeek: number;
};

function getLayout(bp: Breakpoint, viewportW: number): Layout {
  if (bp === 'mobile') {
    const activeW = Math.min(viewportW * 0.72, viewportW - 64);
    return {
      gap: 10,
      nearGap: 6,
      visible: 1,
      edgePeek: Math.round(viewportW * 0.16),
      tiers: [
        { w: activeW, h: Math.min(370, Math.max(340, viewportW * 0.9)), scale: 1, opacity: 1, y: 0 },
        { w: Math.min(170, viewportW * 0.44), h: 265, scale: 0.93, opacity: 0.82, y: 8 },
        { w: 140, h: 225, scale: 0.82, opacity: 0.55, y: 12 },
        { w: 130, h: 210, scale: 0.76, opacity: 0.4, y: 16 },
      ],
    };
  }

  if (bp === 'tablet') {
    return {
      gap: 10,
      nearGap: 6,
      visible: 2,
      edgePeek: 44,
      tiers: [
        { w: Math.min(320, Math.max(300, viewportW * 0.36)), h: 400, scale: 1, opacity: 1, y: 0 },
        { w: 195, h: 280, scale: 0.92, opacity: 0.88, y: 8 },
        { w: 145, h: 230, scale: 0.82, opacity: 0.67, y: 14 },
        { w: 135, h: 215, scale: 0.76, opacity: 0.52, y: 18 },
      ],
    };
  }

  // Desktop — 5 cartes + peeks latéraux (visible 3)
  let active: SlideTier = { w: 300, h: 385, scale: 1, opacity: 1, y: 0 };
  let near: SlideTier = { w: 185, h: 270, scale: 0.92, opacity: 0.88, y: 8 };
  let outer: SlideTier = { w: 135, h: 215, scale: 0.82, opacity: 0.67, y: 14 };
  let edge: SlideTier = { w: 128, h: 205, scale: 0.76, opacity: 0.52, y: 18 };
  let gap = 10;
  let nearGap = 6;
  let edgePeek = 42;

  if (viewportW >= 1920) {
    active = { w: 330, h: 420, scale: 1, opacity: 1, y: 0 };
    near = { w: 205, h: 295, scale: 0.92, opacity: 0.9, y: 8 };
    outer = { w: 150, h: 240, scale: 0.82, opacity: 0.7, y: 14 };
    edge = { w: 138, h: 220, scale: 0.76, opacity: 0.54, y: 18 };
    gap = 12;
    nearGap = 7;
    edgePeek = 52;
  } else if (viewportW >= 1600) {
    active = { w: 320, h: 410, scale: 1, opacity: 1, y: 0 };
    near = { w: 200, h: 288, scale: 0.92, opacity: 0.89, y: 8 };
    outer = { w: 146, h: 235, scale: 0.82, opacity: 0.69, y: 14 };
    edge = { w: 135, h: 215, scale: 0.76, opacity: 0.53, y: 18 };
    gap = 11;
    nearGap = 7;
    edgePeek = 48;
  } else if (viewportW >= 1440) {
    active = { w: 315, h: 400, scale: 1, opacity: 1, y: 0 };
    near = { w: 195, h: 282, scale: 0.92, opacity: 0.89, y: 8 };
    outer = { w: 142, h: 228, scale: 0.82, opacity: 0.67, y: 14 };
    edge = { w: 132, h: 210, scale: 0.76, opacity: 0.52, y: 18 };
    gap = 11;
    nearGap = 6;
    edgePeek = 46;
  } else if (viewportW >= 1366) {
    active = { w: 308, h: 392, scale: 1, opacity: 1, y: 0 };
    near = { w: 190, h: 275, scale: 0.92, opacity: 0.88, y: 8 };
    outer = { w: 138, h: 222, scale: 0.82, opacity: 0.67, y: 14 };
    edge = { w: 130, h: 208, scale: 0.76, opacity: 0.52, y: 18 };
    gap = 10;
    nearGap = 6;
    edgePeek = 44;
  }

  return {
    gap,
    nearGap,
    visible: 3,
    edgePeek,
    tiers: [active, near, outer, edge],
  };
}

function tierVisualHalf(tier: SlideTier) {
  return (tier.w * tier.scale) / 2;
}

/**
 * Chaîne continue : active → adjacentes (nearGap) → outer → peeks.
 * Les peeks ne sont plus collés aux bords du viewport (évite le grand vide).
 */
function getSlideX(offset: number, layout: Layout, _viewportW: number) {
  if (offset === 0) return 0;
  const dir = Math.sign(offset);
  const abs = Math.abs(offset);
  const [active, near, outer, edge] = layout.tiers;

  // Adjacent (±1) : plus proche de l’active
  const x1 = tierVisualHalf(active) + layout.nearGap + tierVisualHalf(near);
  if (abs === 1) return dir * x1;

  // Outer (±2)
  const x2 = x1 + tierVisualHalf(near) + layout.gap + tierVisualHalf(outer);
  if (abs === 2) return dir * x2;

  // Peek (±3) : juste après l’outer, partiellement hors cadre
  const x3 = x2 + tierVisualHalf(outer) + layout.gap + tierVisualHalf(edge);
  return dir * x3;
}

function getTier(offset: number, layout: Layout): SlideTier {
  const abs = Math.min(Math.abs(offset), layout.tiers.length - 1);
  return layout.tiers[abs];
}

export function HomeCategoriesEditorial() {
  const { displayItems: categories, loading: categoriesLoading } =
    useHomeSpotlightCategories();
  const total = categories.length;
  const [active, setActive] = useState(0);
  const [viewportW, setViewportW] = useState(1440);
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const reduce = useReducedMotion();
  const bp = useBreakpoint();
  const layout = useMemo(() => getLayout(bp, viewportW), [bp, viewportW]);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const locked = useRef(false);

  useEffect(() => {
    const update = () => setViewportW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (active >= total && total > 0) setActive(0);
  }, [active, total]);

  const goTo = useCallback(
    (next: number) => {
      if (locked.current) return;
      const normalized = LOOP
        ? ((next % total) + total) % total
        : Math.min(Math.max(next, 0), total - 1);
      if (normalized === active) return;
      locked.current = true;
      setActive(normalized);
      animate(dragX, 0, { type: 'tween', duration: 0.2, ease: EASE });
      // Simple anti-rebond : l’animation reste interruptible, on empêche
      // seulement les doubles déclenchements involontaires.
      window.setTimeout(() => {
        locked.current = false;
      }, reduce ? 80 : 200);
    },
    [active, dragX, reduce, total],
  );

  const go = useCallback((dir: -1 | 1) => goTo(active + dir), [active, goTo]);

  useEffect(() => {
    if (reduce || autoplayPaused) return;

    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      go(1);
    };

    const id = window.setInterval(tick, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplayPaused, go, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = stageRef.current;
      if (!el) return;
      const focused = document.activeElement;
      const inSection =
        el.contains(focused) ||
        focused === el ||
        (focused instanceof HTMLElement && focused.closest('.home-cats'));
      if (!inSection) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const duration = reduce ? 0.01 : TRANSITION_S;
  const current = categories[active];

  if (categoriesLoading) {
    return (
      <section id="categories-home" className="home-cats" aria-busy="true">
        <div className="home-container">
          <header className="home-cats__intro">
            <h2 className="home-cats__title">Explorez nos univers</h2>
            <p className="home-cats__desc">Chargement des catégories…</p>
          </header>
        </div>
      </section>
    );
  }

  if (total === 0) return null;

  return (
    <section
      id="categories-home"
      className="home-cats"
      aria-labelledby="home-cats-heading"
    >
      <div className="home-container">
        <header className="home-cats__intro">
          <div className="home-cats__heading">
            <h2 id="home-cats-heading" className="home-cats__title">
              Explorez nos univers
            </h2>
            <p className="home-cats__pager" aria-live="polite">
              <span className="home-cats__pager-current">{padIndex(active + 1)}</span>
              <span className="home-cats__pager-sep" aria-hidden>
                /
              </span>
              <span className="home-cats__pager-total">{padIndex(total)}</span>
            </p>
          </div>
          <p className="home-cats__desc">
            Une sélection MDiscover Impex Food pensée pour les professionnels.
          </p>
        </header>

        <div
          ref={stageRef}
          className="home-cats__stage"
          role="region"
          aria-roledescription="carousel"
          aria-label="Carrousel des catégories"
          tabIndex={0}
          onMouseEnter={() => setAutoplayPaused(true)}
          onMouseLeave={() => setAutoplayPaused(false)}
          onFocusCapture={() => setAutoplayPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setAutoplayPaused(false);
            }
          }}
        >
          <motion.div
            className="home-cats__track"
            style={{ x: dragX }}
            drag={reduce ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragStart={() => setAutoplayPaused(true)}
            onDragEnd={(_, info) => {
              const threshold = bp === 'mobile' ? 48 : 70;
              if (info.offset.x < -threshold || info.velocity.x < -450) {
                go(1);
              } else if (info.offset.x > threshold || info.velocity.x > 450) {
                go(-1);
              } else {
                animate(dragX, 0, { type: 'tween', duration: 0.35, ease: EASE });
              }
            }}
          >
            {categories.map((cat, index) => {
              const offset = wrapOffset(index, active, total);
              if (Math.abs(offset) > layout.visible) return null;

              const isActive = offset === 0;
              const abs = Math.abs(offset);
              const tier = getTier(offset, layout);
              const xOffset = getSlideX(offset, layout, viewportW);

              return (
                <motion.article
                  key={cat.slugFr}
                  className={cn(
                    'home-cats__slide',
                    isActive && 'home-cats__slide--active',
                    abs === 1 && 'home-cats__slide--near',
                    abs >= 2 && 'home-cats__slide--outer',
                  )}
                  initial={false}
                  animate={{
                    width: tier.w,
                    height: tier.h,
                    x: `calc(-50% + ${xOffset}px)`,
                    y: `calc(-50% + ${tier.y}px)`,
                    scale: tier.scale,
                    opacity: tier.opacity,
                    zIndex: isActive ? 30 : 20 - abs,
                    filter: isActive
                      ? 'saturate(1) brightness(1)'
                      : abs === 1
                        ? 'saturate(0.98) brightness(0.995)'
                        : 'saturate(0.96) brightness(0.99)',
                  }}
                  transition={{ duration, ease: EASE }}
                  aria-hidden={!isActive}
                >
                  {isActive ? (
                    <Link
                      href={`/catalogue?category=${cat.slugFr}`}
                      className="home-cats__card home-cats__card--active"
                      aria-current="true"
                      aria-label={`${cat.nameFr} — Explorer la catégorie`}
                    >
                      <div className="home-cats__media">
                        <Image
                          src={cat.imageUrl}
                          alt={cat.imageAlt}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 767px) 72vw, (max-width: 1023px) 380px, 410px"
                          className="home-cats__img"
                        />
                        <div className="home-cats__shade" aria-hidden />
                      </div>

                      <motion.div
                        className="home-cats__body"
                        key={`body-${cat.slugFr}`}
                        initial={reduce ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: reduce ? 0.01 : 0.34,
                          ease: EASE,
                          delay: reduce ? 0 : 0.06,
                        }}
                      >
                        <h3 className="home-cats__name">{cat.nameFr}</h3>
                        <p className="home-cats__blurb">{cat.short}</p>
                        <span className="home-cats__cta">
                          Explorer la catégorie
                          <ArrowUpRight
                            className="home-cats__cta-icon"
                            strokeWidth={2.2}
                            aria-hidden
                          />
                        </span>
                      </motion.div>
                    </Link>
                  ) : abs === 1 ? (
                    <Link
                      href={`/catalogue?category=${cat.slugFr}`}
                      className={cn('home-cats__card home-cats__card--side')}
                      tabIndex={0}
                      aria-label={`${cat.nameFr} — Explorer la catégorie`}
                    >
                      <div className="home-cats__media">
                        <Image
                          src={cat.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 767px) 76vw, 250px"
                          className="home-cats__img"
                        />
                        <div className="home-cats__shade home-cats__shade--side" aria-hidden />
                      </div>
                      <div className="home-cats__body home-cats__body--side">
                        <h3 className="home-cats__name">{cat.nameFr}</h3>
                      </div>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        'home-cats__card home-cats__card--side',
                        'home-cats__card--outer',
                      )}
                      onClick={() => goTo(index)}
                      tabIndex={-1}
                      aria-label={`Afficher ${cat.nameFr}`}
                    >
                      <div className="home-cats__media">
                        <Image
                          src={cat.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 767px) 160px, 190px"
                          className="home-cats__img"
                        />
                        <div className="home-cats__shade home-cats__shade--side" aria-hidden />
                      </div>
                      <div className="home-cats__body home-cats__body--side">
                        <h3 className="home-cats__name">{cat.nameFr}</h3>
                      </div>
                    </button>
                  )}
                </motion.article>
              );
            })}
          </motion.div>
        </div>

        <div className="home-cats__footer">
          <p className="home-cats__meta-label">{total} univers produits</p>
          <div className="home-cats__nav">
            <button
              type="button"
              className="home-cats__nav-btn"
              aria-label="Catégorie précédente"
              disabled={!LOOP && active === 0}
              onClick={() => go(-1)}
            >
              <ArrowLeft className="home-cats__nav-icon" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="home-cats__nav-btn"
              aria-label="Catégorie suivante"
              disabled={!LOOP && active === total - 1}
              onClick={() => go(1)}
            >
              <ArrowRight className="home-cats__nav-icon" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <p className="sr-only">
          Catégorie active : {current.nameFr}. Utilisez les flèches ou glissez pour
          naviguer.
        </p>
      </div>
    </section>
  );
}
