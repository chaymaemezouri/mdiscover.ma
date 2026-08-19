'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { OffersProductCard } from '@/components/home/OffersProductCard';
import type { ProductListItem } from '@/lib/api';

const EASE = [0.22, 1, 0.36, 1] as const;

type HomeOffersSectionProps = {
  items: ProductListItem[];
  title?: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  emptyMessage?: string;
  titleId?: string;
  markFirstAsFeatured?: boolean;
  showNewBadge?: boolean;
  eyebrow?: string;
};

export function HomeOffersSection({
  items,
  title = 'Meilleures offres',
  description = 'Des références sélectionnées à des conditions avantageuses pour vos besoins professionnels.',
  href = '/catalogue?promo=true',
  linkLabel = 'Voir toutes les promotions',
  emptyMessage = 'Aucune promotion pour le moment.',
  titleId = 'home-offers-title',
  markFirstAsFeatured = true,
  showNewBadge = false,
  eyebrow = '',
}: HomeOffersSectionProps) {
  const reduce = useReducedMotion();
  const list = items.slice(0, 10);

  const fade = (delay = 0, y = 16) =>
    reduce
      ? undefined
      : {
          initial: { opacity: 0, y },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.35 },
          transition: { duration: 0.55, delay, ease: EASE },
        };

  return (
    <section className="home-offers" aria-labelledby={titleId}>
      <div className="home-container home-offers__inner">
        <header className="home-offers__header">
          <div className="home-offers__lead">
            {eyebrow ? (
              <motion.p className="home-offers__eyebrow" {...fade(0.02, 10)}>
                {eyebrow}
              </motion.p>
            ) : null}
            <motion.h2 id={titleId} className="home-offers__title" {...fade(0.06, 16)}>
              {title}
            </motion.h2>

            <motion.p className="home-offers__desc" {...fade(0.12, 14)}>
              {description}
            </motion.p>
          </div>

          <motion.div className="home-offers__cta-wrap" {...fade(0.1, 14)}>
            <Link href={href} className="home-offers__cta">
              {linkLabel}
              <ArrowUpRight className="home-offers__cta-icon" aria-hidden />
            </Link>
          </motion.div>
        </header>

        {list.length === 0 ? (
          <p className="home-offers__empty">{emptyMessage}</p>
        ) : (
          <>
            <div className="home-offers__track">
              {list.map((product, index) => (
                <motion.div
                  key={product.id}
                  className="home-offers__slide"
                  {...(reduce
                    ? undefined
                    : {
                        initial: { opacity: 0, y: 18 },
                        whileInView: { opacity: 1, y: 0 },
                        viewport: { once: true, amount: 0.2 },
                        transition: {
                          duration: 0.5,
                          delay: 0.08 + Math.min(index, 4) * 0.06,
                          ease: EASE,
                        },
                      })}
                >
                  <OffersProductCard
                    product={product}
                    featured={markFirstAsFeatured && index === 0}
                    isNew={showNewBadge}
                    priority={index < 2}
                  />
                </motion.div>
              ))}
            </div>

            {list.length > 5 ? (
              <div className="home-offers__mobile-more">
                <Link href={href} className="home-offers__mobile-more-link">
                  Voir plus
                  <ArrowUpRight className="home-offers__mobile-more-icon" aria-hidden />
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
