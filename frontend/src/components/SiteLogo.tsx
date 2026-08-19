import Image from 'next/image';
import Link from 'next/link';

type SiteLogoProps = {
  href?: string | null;
  height?: number;
  className?: string;
  priority?: boolean;
  /** Fond sombre : variante crème du lettrage, sans pastille */
  onDark?: boolean;
};

/** Ratios réels des fichiers rognés au plus près du dessin. */
const RATIO = { dark: 1540 / 267, light: 1531 / 265 };

export function SiteLogo({
  href = '/',
  height = 36,
  className = '',
  priority = false,
  onDark = false,
}: SiteLogoProps) {
  const width = Math.round(height * (onDark ? RATIO.light : RATIO.dark));

  const img = (
    <Image
      src={onDark ? '/logo-light-clean.png' : '/logo-clean.png'}
      alt="Discover"
      width={width}
      height={height}
      priority={priority}
      className={onDark ? 'site-logo site-logo--on-dark' : 'site-logo'}
      style={{
        height,
        width: 'auto',
        objectFit: 'contain',
        background: 'transparent',
      }}
    />
  );

  if (href === null) {
    return <span className={`brand-logo-link ${className}`.trim()}>{img}</span>;
  }

  return (
    <Link
      href={href}
      className={`brand-logo-link ${className}`.trim()}
      aria-label="Discover — accueil"
    >
      {img}
    </Link>
  );
}
