'use client';

import Image, { getImageProps } from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { HeroIntro, HeroStats } from '@/components/home/HeroContent';

const HERO_ALT =
  'Composition premium de produits alimentaires et d’hygiène pour professionnels.';

const HERO_IMAGE_DESKTOP = '/hero/fin2-wide.jpg';
const HERO_IMAGE_MOBILE = '/hero/hero_mobile_v4.jpg';
const HERO_BRANCH = '/hero/branch.png';

function HeroPhoto() {
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({
    alt: HERO_ALT,
    src: HERO_IMAGE_MOBILE,
    width: 1200,
    height: 999,
    quality: 92,
    sizes: '100vw',
  });
  const {
    props: { srcSet: desktopSrcSet, ...desktop },
  } = getImageProps({
    alt: HERO_ALT,
    src: HERO_IMAGE_DESKTOP,
    width: 2400,
    height: 1350,
    quality: 90,
    priority: true,
    sizes: '(min-width: 768px) 190vw, 100vw',
  });

  return (
    <picture className="home-hero__picture">
      <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes="100vw" />
      <source
        media="(min-width: 768px)"
        srcSet={desktopSrcSet}
        sizes="190vw"
      />
      <img
        {...desktop}
        alt={HERO_ALT}
        className="home-hero__photo-img"
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}

export function HomeHeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="home-hero relative z-[5]">
      <div className="home-hero__stage">
        <div className="home-hero__bg" aria-hidden />

        <motion.div
          className="home-hero__visual"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroPhoto />
          <Image
            src={HERO_BRANCH}
            alt=""
            aria-hidden
            width={385}
            height={189}
            priority
            className="home-hero__branch"
          />
          <div className="home-hero__visual-fade" aria-hidden />
          <div className="home-hero__visual-top" aria-hidden />
        </motion.div>

        <div className="home-hero__copy-col home-container">
          <div className="home-hero__left">
            <HeroIntro />
            <HeroStats />
          </div>
        </div>
      </div>
    </section>
  );
}
