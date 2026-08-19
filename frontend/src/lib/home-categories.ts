export type HomeCategory = {
  slugFr: string;
  nameFr: string;
  descriptionFr: string;
  imageUrl: string;
  imageAlt: string;
};

/** Catégories vitrine home — images éditoriales cohérentes (même vibe photo). */
export const HOME_CATEGORIES: HomeCategory[] = [
  {
    slugFr: 'epices',
    nameFr: 'Épices',
    descriptionFr:
      'Épices sélectionnées pour leur pureté, leur arôme et leur authenticité, issues de sources fiables aux normes de qualité les plus exigeantes.',
    imageUrl: '/categories/epices.png',
    imageAlt: 'Bols d’épices : paprika, curcuma, cumin et poivre',
  },
  {
    slugFr: 'fruits-secs',
    nameFr: 'Fruits secs',
    descriptionFr:
      'Fruits secs premium choisis pour leur qualité naturelle, leur goût riche et leur fraîcheur, provenant d’origines de confiance.',
    imageUrl: '/categories/fruits-secs.png',
    imageAlt: 'Dattes, figues séchées, amandes et abricots secs',
  },
  {
    slugFr: 'legumineuses',
    nameFr: 'Légumineuses',
    descriptionFr:
      'Légumineuses de qualité, sélectionnées pour leur nutrition et leur authenticité, auprès de producteurs fiables aux standards internationaux.',
    imageUrl: '/categories/legumineuses.png',
    imageAlt: 'Lentilles, pois chiches et haricots',
  },
  {
    slugFr: 'huiles-alimentaires',
    nameFr: 'Huiles',
    descriptionFr:
      'Huiles alimentaires soigneusement sélectionnées pour leur pureté et leur usage professionnel.',
    imageUrl: '/categories/huiles.png',
    imageAlt: 'Bouteille d’huile d’olive et branche d’olivier',
  },
  {
    slugFr: 'pates',
    nameFr: 'Pâtes',
    descriptionFr:
      'Pâtes de qualité professionnelle pour la distribution et la restauration.',
    imageUrl: '/categories/pates.png',
    imageAlt: 'Pâtes sèches premium',
  },
  {
    slugFr: 'fruits-legumes',
    nameFr: 'Fruits & légumes',
    descriptionFr:
      'Fruits et légumes sélectionnés pour leur fraîcheur, leur pureté naturelle et leur goût, issus d’origines de confiance.',
    imageUrl: '/categories/fruits-legumes.png',
    imageAlt: 'Composition fraîche de fruits et légumes',
  },
  {
    slugFr: 'cereales-riz-pates',
    nameFr: 'Céréales',
    descriptionFr:
      'Céréales de qualité supérieure, texture soignée et goût authentique, auprès de producteurs de confiance.',
    imageUrl: '/categories/cereales.png',
    imageAlt: 'Avoine, blé et grains',
  },
  {
    slugFr: 'hygiene',
    nameFr: 'Hygiène',
    descriptionFr:
      'Gammes d’hygiène et d’entretien pour professionnels et distribution, avec un sourcing fiable et des formats adaptés au B2B.',
    imageUrl: '/categories/hygiene.png',
    imageAlt: 'Flacon pompe mat et savon naturel',
  },
];

export function getCategoryVisual(slug: string): HomeCategory | undefined {
  return HOME_CATEGORIES.find((c) => c.slugFr === slug);
}

export function catalogueCategoryHref(slug: string) {
  return `/catalogue?category=${encodeURIComponent(slug)}`;
}
