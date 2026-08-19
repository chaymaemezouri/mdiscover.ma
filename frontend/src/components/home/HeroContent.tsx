'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { QuoteGate } from '@/components/QuoteGate';

const HERO_STATS = [
  {
    value: '48h',
    count: 48,
    suffix: 'h',
    label: 'Livraison',
    labelMobile: 'Livraison express',
  },
  {
    value: '15+',
    count: 15,
    suffix: '+',
    label: 'Ans d’expérience',
    labelMobile: 'Expérience',
  },
  {
    value: '500+',
    count: 500,
    suffix: '+',
    label: 'Références B2B',
    labelMobile: 'Références B2B',
  },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease },
  },
};

function StatCount({
  to,
  suffix,
  reduce,
}: {
  to: number;
  suffix: string;
  reduce: boolean | null;
}) {
  const [n, setN] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) {
      setN(to);
      return;
    }
    const ctrl = animate(0, to, {
      duration: to >= 100 ? 1.15 : 0.9,
      ease,
      delay: 0.42,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [to, reduce]);

  return (
    <>
      {n}
      {suffix}
    </>
  );
}

export function HeroIntro() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="home-hero__copy relative"
      initial={reduce ? false : 'hidden'}
      animate="show"
      variants={{
        show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
      }}
    >
      <motion.h1 className="home-hero__title relative" variants={fadeUp}>
        <span className="block">L’essentiel pour les</span>
        <span className="block">professionnels.</span>
      </motion.h1>

      <motion.p
        className="home-hero__desc relative mt-5 text-[15px] leading-[1.65] font-medium sm:mt-6 sm:text-[16px] sm:leading-[1.7]"
        variants={fadeUp}
      >
        Produits alimentaires et d’hygiène sélectionnés pour vos besoins d’approvisionnement, de
        distribution et de sourcing B2B.
      </motion.p>

      <motion.div
        className="home-hero__actions relative mt-6 flex flex-col items-start gap-4 md:mt-7 md:flex-row md:items-center md:gap-6"
        variants={{
          show: { transition: { staggerChildren: 0.08 } },
        }}
      >
        <motion.div variants={fadeUp} className="w-full md:w-auto">
          <Link href="/catalogue" className="home-hero__cta-primary">
            <span>Explorer le catalogue</span>
            <span className="home-hero__cta-arrow" aria-hidden>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
          </Link>
        </motion.div>

        <QuoteGate>
          <motion.div variants={fadeUp} className="w-full md:w-auto">
            <Link href="/devis" className="home-hero__cta-secondary">
              <span>Demander un devis</span>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            </Link>
          </motion.div>
        </QuoteGate>
      </motion.div>
    </motion.div>
  );
}

export function HeroStats() {
  const reduce = useReducedMotion();

  return (
    <motion.ul
      className="home-hero__stats relative"
      aria-label="Points forts Discover"
      initial={reduce ? false : 'hidden'}
      animate="show"
      variants={{
        show: { transition: { staggerChildren: 0.1, delayChildren: 0.38 } },
      }}
    >
      {HERO_STATS.map((stat) => (
        <motion.li key={stat.label} className="home-hero__stat" variants={fadeUp}>
          <span className="home-hero__stat-value block font-[family-name:var(--font-title)] text-[1.65rem] font-bold leading-none tracking-[-0.04em] sm:text-[1.85rem]">
            <StatCount to={stat.count} suffix={stat.suffix} reduce={reduce} />
          </span>
          <span className="home-hero__stat-label home-hero__stat-label--desk mt-2 block text-[11px] font-medium leading-snug sm:text-[12px]">
            {stat.label}
          </span>
          <span className="home-hero__stat-label home-hero__stat-label--mobi mt-2 block text-[11px] font-medium leading-snug">
            {stat.labelMobile}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function HeroContent() {
  return (
    <>
      <HeroIntro />
      <HeroStats />
    </>
  );
}
