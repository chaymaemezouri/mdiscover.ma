'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { QuoteGate } from '@/components/QuoteGate';

const EASE = [0.22, 1, 0.36, 1] as const;

export function HomePresentationSection() {
  const reduce = useReducedMotion();

  const fade = (delay = 0, y = 16) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.65, delay, ease: EASE },
        };

  return (
    <section className="home-present" aria-labelledby="home-present-heading">
      <div className="home-present__shell">
        <div className="home-present__bg" aria-hidden>
          <Image
            src="/images/sourcing-left.jpeg"
            alt=""
            fill
            className="home-present__bg-img"
            sizes="(min-width: 1440px) 1440px, 100vw"
            quality={80}
          />
          <div className="home-present__veil" />
        </div>

        <div className="home-present__copy">
          <motion.p className="home-present__eyebrow" {...fade(0.02, 8)}>
            Discover · Partenaire{' '}
            <span className="home-present__eyebrow-accent">B2B</span>
          </motion.p>

          <motion.h2
            id="home-present-heading"
            className="home-present__title"
            {...fade(0.08, 16)}
          >
            Un approvisionnement pensé pour{' '}
            <span className="home-present__title-accent">votre activité</span>.
          </motion.h2>

          <motion.p className="home-present__desc" {...fade(0.16, 16)}>
            Des références alimentaires et d’hygiène sélectionnées avec exigence,
            un sourcing adapté et des solutions pensées pour vos besoins
            professionnels.
          </motion.p>

          <motion.div className="home-present__actions" {...fade(0.24, 16)}>
            <Link href="/catalogue" className="home-present__cta">
              <span>Découvrir le catalogue</span>
              <span className="home-present__cta-icon" aria-hidden>
                <ArrowUpRight strokeWidth={2.2} />
              </span>
            </Link>

            <QuoteGate>
              <Link href="/devis" className="home-present__link">
                <span className="home-present__link-label">Demander un devis</span>
                <ArrowUpRight
                  className="home-present__link-arrow"
                  strokeWidth={2.2}
                  aria-hidden
                />
              </Link>
            </QuoteGate>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
