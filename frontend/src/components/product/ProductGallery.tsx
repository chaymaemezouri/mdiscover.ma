'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { mediaUrl } from '@/lib/api';
import type { ProductDetailImage } from './product-types';

type Props = {
  images: ProductDetailImage[];
  productName: string;
  hasPromo?: boolean;
  isNew?: boolean;
};

export function ProductGallery({ images, productName, hasPromo, isNew }: Props) {
  const sorted = [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const titleId = useId();

  const count = sorted.length;
  const current = count > 0 ? sorted[Math.min(active, count - 1)] : null;
  const src = current ? mediaUrl(current.url) : null;
  const alt = current?.altFr || productName;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (count < 2) return;
      setActive((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, go]);

  return (
    <div className={`pd-gallery${count <= 1 ? ' pd-gallery--solo' : ''}`}>
      <div className="pd-gallery__stage">
        {(isNew || hasPromo) ? (
          <div className="pd-gallery__badges">
            {isNew ? (
              <span className="pd-gallery__badge pd-gallery__badge--new">
                Nouveau
              </span>
            ) : null}
            {hasPromo ? <span className="pd-gallery__badge">Promo</span> : null}
          </div>
        ) : null}
        {src ? (
          <button
            type="button"
            className="pd-gallery__main-btn"
            onClick={() => setLightbox(true)}
            aria-label={`Agrandir l’image : ${alt}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} />
          </button>
        ) : (
          <div className="pd-gallery__fallback">DISCOVER</div>
        )}
      </div>

      {count > 1 ? (
        <div className="pd-gallery__thumbs" role="tablist" aria-label="Vues du produit">
          {sorted.map((img, i) => (
            <button
              key={img.id ?? `${img.url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`pd-gallery__thumb${i === active ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(img.url) ?? undefined} alt="" />
            </button>
          ))}
        </div>
      ) : null}

      {lightbox && src ? (
        <div
          className="pd-lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="pd-lightbox__close"
            aria-label="Fermer"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
          <div
            className="pd-lightbox__frame"
            onClick={(e) => e.stopPropagation()}
          >
            <span id={titleId} className="sr-only">
              {alt}
            </span>
            {count > 1 ? (
              <>
                <button
                  type="button"
                  className="pd-lightbox__nav pd-lightbox__nav--prev"
                  aria-label="Image précédente"
                  onClick={() => go(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="pd-lightbox__nav pd-lightbox__nav--next"
                  aria-label="Image suivante"
                  onClick={() => go(1)}
                >
                  ›
                </button>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} />
            {count > 1 ? (
              <div className="pd-lightbox__counter">
                {active + 1} / {count}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
