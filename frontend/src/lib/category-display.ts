import { mediaUrl, type Category } from '@/lib/api';
import {
  HOME_CATEGORIES,
  getCategoryVisual,
  type HomeCategory,
} from '@/lib/home-categories';

export type CategoryDisplay = {
  id: string;
  slugFr: string;
  nameFr: string;
  descriptionFr: string;
  imageUrl: string;
  imageAlt: string;
  short: string;
};

const DEFAULT_IMAGE = '/categories/epices.png';

function truncateShort(text: string, max = 78): string {
  const t = text.trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function fromHomeCategory(home: HomeCategory): CategoryDisplay {
  return {
    id: home.slugFr,
    slugFr: home.slugFr,
    nameFr: home.nameFr,
    descriptionFr: home.descriptionFr,
    imageUrl: home.imageUrl,
    imageAlt: home.imageAlt,
    short: truncateShort(home.descriptionFr),
  };
}

/** Image et texte admin en priorité absolue (même rendu que le panel admin). */
export function toCategoryDisplay(cat: Category): CategoryDisplay {
  const descriptionFr = cat.descriptionFr?.trim() || '';
  const imageUrl = mediaUrl(cat.imageUrl) ?? '';

  return {
    id: cat.id,
    slugFr: cat.slugFr,
    nameFr: cat.nameFr,
    descriptionFr,
    imageUrl: imageUrl || DEFAULT_IMAGE,
    imageAlt: cat.imageAltFr?.trim() || cat.nameFr,
    short: truncateShort(descriptionFr) || cat.nameFr,
  };
}

/** Catégories racines depuis l’API (tri admin). */
export function buildCategoryDisplays(categories: Category[]): CategoryDisplay[] {
  return categories.map(toCategoryDisplay);
}

/** Repli sur les visuels home si l’API est vide (dev hors ligne). */
export function buildCategoryDisplaysWithFallback(
  categories: Category[],
): CategoryDisplay[] {
  if (categories.length > 0) return buildCategoryDisplays(categories);
  return HOME_CATEGORIES.map(fromHomeCategory);
}

export function findCategoryName(
  categories: Category[],
  slug?: string | null,
): string | undefined {
  if (!slug) return undefined;
  for (const cat of categories) {
    if (cat.slugFr === slug) return cat.nameFr;
    for (const child of cat.children ?? []) {
      if (child.slugFr === slug) return child.nameFr;
    }
  }
  return getCategoryVisual(slug)?.nameFr;
}
