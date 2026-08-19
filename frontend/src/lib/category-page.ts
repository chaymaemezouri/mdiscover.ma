import type { HomeCategory } from './home-categories';
import { getCategoryVisual } from './home-categories';

export type CategorySubFilter = {
  id: string;
  label: string;
  keywords: string[];
};

export type CategoryPageConfig = {
  premiumDescription?: string;
  heroFacts?: string[];
  subFilters?: CategorySubFilter[];
};

const DEFAULT_HERO_FACTS = [
  'Produits sélectionnés',
  'Conditionnements pro',
  'Livraison au Maroc',
  'Approvisionnement B2B',
] as const;

const CATEGORY_PAGE_CONFIG: Record<string, CategoryPageConfig> = {
  'fruits-secs': {
    premiumDescription:
      'Amandes, noix, dattes et fruits séchés soigneusement sélectionnés pour la distribution, la restauration et l’approvisionnement professionnel — qualité constante, traçabilité et formats adaptés aux volumes B2B.',
    heroFacts: [...DEFAULT_HERO_FACTS],
    subFilters: [
      { id: 'amandes', label: 'Amandes', keywords: ['amande'] },
      { id: 'noix', label: 'Noix', keywords: ['noix', 'cajou', 'macadamia', 'noix de'] },
      { id: 'dattes', label: 'Dattes', keywords: ['datte', 'dattes'] },
      { id: 'pistaches', label: 'Pistaches', keywords: ['pistache'] },
      { id: 'noisettes', label: 'Noisettes', keywords: ['noisette'] },
      { id: 'figues', label: 'Figues séchées', keywords: ['figue'] },
    ],
  },
  epices: {
    premiumDescription:
      'Aromates, poudres et mélanges d’épices pour les professionnels exigeants — pureté, constance et formats adaptés à la distribution et à la restauration.',
  },
  legumineuses: {
    premiumDescription:
      'Légumineuses sélectionnées pour leur qualité nutritionnelle et leur régularité — idéales pour l’approvisionnement B2B et les volumes professionnels.',
  },
  'huiles-alimentaires': {
    premiumDescription:
      'Huiles alimentaires choisies pour leur pureté et leur usage professionnel — conditionnements adaptés à la distribution et à la restauration.',
  },
  pates: {
    premiumDescription:
      'Pâtes de qualité pour la restauration et la distribution — sélection rigoureuse et formats professionnels.',
  },
  'fruits-legumes': {
    premiumDescription:
      'Fruits et légumes sélectionnés pour leur fraîcheur et leur constance — approvisionnement fiable pour les professionnels.',
  },
  'cereales-riz-pates': {
    premiumDescription:
      'Céréales, riz et grains pour la cuisine professionnelle — qualité supérieure et formats adaptés aux volumes B2B.',
  },
  hygiene: {
    premiumDescription:
      'Gammes d’hygiène et d’entretien pour professionnels — sourcing fiable, formats B2B et livraison au Maroc.',
  },
};

export function getCategoryPageConfig(slug: string): CategoryPageConfig {
  return CATEGORY_PAGE_CONFIG[slug] ?? {};
}

export function getCategoryHeroFacts(slug: string): string[] {
  return getCategoryPageConfig(slug).heroFacts ?? [...DEFAULT_HERO_FACTS];
}

export function getCategoryDescription(
  slug: string,
  apiDescription?: string | null,
  visual?: HomeCategory,
): string {
  const trimmed = apiDescription?.trim();
  if (trimmed) return trimmed;
  const config = getCategoryPageConfig(slug);
  if (config.premiumDescription) return config.premiumDescription;
  return visual?.descriptionFr ?? '';
}

export function getCategorySubFilters(slug: string): CategorySubFilter[] {
  return getCategoryPageConfig(slug).subFilters ?? [];
}

export function productMatchesSubFilter(
  product: { nameFr: string; packaging?: string | null },
  filter: CategorySubFilter,
): boolean {
  const haystack = `${product.nameFr} ${product.packaging ?? ''}`.toLowerCase();
  return filter.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}
