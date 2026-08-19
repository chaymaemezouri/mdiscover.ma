'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { QuoteGate } from '@/components/QuoteGate';

const EASE = [0.22, 1, 0.36, 1] as const;

const LEFT_ALT =
  'Ingrédients alimentaires sélectionnés pour un sourcing B2B professionnel';
const RIGHT_ALT =
  'Composition premium de produits alimentaires et d’hygiène pour professionnels';

type FadeOpts = {
  initial?: { opacity: number; y?: number; x?: number };
  whileInView?: { opacity: number; y?: number; x?: number };
  viewport?: { once: boolean; amount: number };
  transition?: { duration: number; delay: number; ease: typeof EASE };
};

function useFade(reduce: boolean | null) {
  return (delay = 0, y = 0, x = 0): FadeOpts => {
    if (reduce) return {};
    return {
      initial: { opacity: 0, ...(y ? { y } : {}), ...(x ? { x } : {}) },
      whileInView: { opacity: 1, y: 0, x: 0 },
      viewport: { once: true, amount: 0.3 },
      transition: { duration: 0.65, delay, ease: EASE },
    };
  };
}

const SOURCING_TICKER = [
  'Sourcing maîtrisé',
  'Livraison pro',
  'Catalogue B2B',
  'Alimentaire & hygiène',
  'Devis sur mesure',
  'Approvisionnement pro',
] as const;

function SourcingTicker({ variant }: { variant: 'top' | 'bottom' }) {
  return (
    <div
      className={`home-sourcing__ticker home-sourcing__ticker--${variant}`}
      aria-hidden
    >
      <div className="home-sourcing__ticker-track">
        {[0, 1].map((group) => (
          <div key={group} className="home-sourcing__ticker-group">
            {SOURCING_TICKER.map((label) => (
              <span key={`${group}-${label}`} className="home-sourcing__ticker-item">
                {label}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandPromoSection() {
  const reduce = useReducedMotion();
  const fade = useFade(reduce);

  return (
    <section className="home-sourcing" aria-labelledby="brand-promo-heading">
      <SourcingTicker variant="top" />
      <div className="home-sourcing__shell">
        <motion.div
          className="home-sourcing__side home-sourcing__side--left"
          {...fade(0, 0, -12)}
        >
          <div className="home-sourcing__frame home-sourcing__frame--left">
            <Image
              src="/images/sourcing-left.jpeg"
              alt={LEFT_ALT}
              fill
              className="home-sourcing__img"
              sizes="(min-width: 900px) 26vw, 0px"
            />
          </div>
        </motion.div>

        <div className="home-sourcing__center">
          <div className="home-sourcing__glow" aria-hidden />
          <div className="home-sourcing__copy">
            <motion.p className="home-sourcing__eyebrow" {...fade(0.06, 8, 0)}>
              Sourcing personnalisé
              <span className="home-sourcing__eyebrow-accent"> · B2B</span>
            </motion.p>

            <h2 id="brand-promo-heading" className="home-sourcing__title">
              <motion.span className="block" {...fade(0.12, 14, 0)}>
                Vous l&apos;imaginez.
              </motion.span>
              <motion.span className="block" {...fade(0.2, 14, 0)}>
                Nous le{' '}
                <span className="home-sourcing__word-accent">sourçons</span>.
              </motion.span>
            </h2>

            <motion.p className="home-sourcing__desc" {...fade(0.3, 12, 0)}>
              Une sélection personnalisée de produits alimentaires et
              d&apos;hygiène, avec un sourcing maîtrisé et des livraisons adaptées
              à votre activité.
            </motion.p>

            <motion.div className="home-sourcing__cta-wrap" {...fade(0.38, 10, 0)}>
              <QuoteGate
                fallback={
                  <Link
                    href="/catalogue"
                    className="home-sourcing__cta"
                    aria-label="Découvrir le catalogue"
                  >
                    <span>Découvrir le catalogue</span>
                    <span className="home-sourcing__cta-icon" aria-hidden>
                      <ArrowUpRight strokeWidth={2.2} />
                    </span>
                  </Link>
                }
              >
                <Link
                  href="/devis"
                  className="home-sourcing__cta"
                  aria-label="Demander un sourcing sur mesure"
                >
                  <span>Demander un sourcing sur mesure</span>
                  <span className="home-sourcing__cta-icon" aria-hidden>
                    <ArrowUpRight strokeWidth={2.2} />
                  </span>
                </Link>
              </QuoteGate>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="home-sourcing__side home-sourcing__side--right"
          {...fade(0.06, 0, 12)}
        >
          <div className="home-sourcing__frame home-sourcing__frame--right">
            <Image
              src="/images/sourcing-right.jpeg"
              alt={RIGHT_ALT}
              fill
              className="home-sourcing__img"
              sizes="(min-width: 900px) 26vw, 0px"
            />
          </div>
        </motion.div>

        <motion.div className="home-sourcing__mobile-media" {...fade(0.28, 14, 0)}>
          <div className="home-sourcing__mobile-main">
            <Image
              src="/images/sourcing-right.jpeg"
              alt={RIGHT_ALT}
              fill
              className="home-sourcing__img"
              sizes="(max-width: 899px) 92vw, 0px"
              priority={false}
            />
          </div>
        </motion.div>
      </div>
      <SourcingTicker variant="bottom" />
    </section>
  );
}
