type FlyOptions = {
  from: DOMRect;
  to: DOMRect;
  kind: 'cart' | 'favorite';
  imageUrl?: string | null;
  duration?: number;
};

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function flyToNav({
  from,
  to,
  kind,
  imageUrl,
  duration,
}: FlyOptions): Promise<void> {
  if (typeof document === 'undefined' || prefersReducedMotion()) {
    return Promise.resolve();
  }

  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const ms = duration ?? (isMobile ? 520 : 640);

  const el = document.createElement('div');
  el.className = `home-fly home-fly--${kind}`;
  el.setAttribute('aria-hidden', 'true');

  const size = kind === 'cart' ? (isMobile ? 36 : 44) : isMobile ? 18 : 22;
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const endX = to.left + to.width / 2 - size / 2;
  const endY = to.top + to.height / 2 - size / 2;

  Object.assign(el.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: '9999',
    pointerEvents: 'none',
    borderRadius: kind === 'cart' ? '999px' : '999px',
    overflow: 'hidden',
    willChange: 'transform, opacity',
  });

  if (kind === 'cart' && imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '';
    Object.assign(img.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    });
    el.appendChild(img);
    el.style.boxShadow = '0 8px 20px rgba(14,42,71,0.18)';
    el.style.border = '2px solid #fff';
    el.style.background = '#eef3f7';
  } else {
    el.style.background = '#e35d6a';
    el.style.boxShadow = '0 6px 14px rgba(227,93,106,0.35)';
  }

  document.body.appendChild(el);

  const dx = endX - startX;
  const dy = endY - startY;

  return new Promise((resolve) => {
    const anim = el.animate(
      [
        {
          transform: 'translate(0, 0) scale(1)',
          opacity: 1,
        },
        {
          transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 24}px) scale(${kind === 'cart' ? 0.72 : 0.9})`,
          opacity: 0.95,
          offset: 0.55,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${kind === 'cart' ? 0.25 : 0.55})`,
          opacity: 0,
        },
      ],
      {
        duration: ms,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );

    const cleanup = () => {
      el.remove();
      resolve();
    };

    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
    window.setTimeout(cleanup, ms + 80);
  });
}
