export type NavLink = {
  href: string;
  label: string;
  match?: (pathname: string) => boolean;
};

export const PRIMARY_NAV: NavLink[] = [
  {
    href: '/categories',
    label: 'Catégories',
    match: (p) => p.startsWith('/categories'),
  },
  {
    href: '/catalogue?sort=new',
    label: 'Nouveautés',
  },
  { href: '/contact', label: 'Contact', match: (p) => p.startsWith('/contact') },
];

export const SECONDARY_NAV: NavLink[] = [
  {
    href: '/a-propos',
    label: 'À propos',
    match: (p) => p.startsWith('/a-propos'),
  },
];

export type UspItem = {
  title: string;
  description: string;
  icon: 'truck' | 'briefcase' | 'shield' | 'headset';
};

export const USP_ITEMS: UspItem[] = [
  {
    title: 'Livraison professionnelle',
    description: 'Logistique adaptée aux volumes B2B',
    icon: 'truck',
  },
  {
    title: 'Commandes B2B',
    description: 'Processus clairs pour les pros',
    icon: 'briefcase',
  },
  {
    title: 'Sourcing fiable',
    description: 'Partenaires contrôlés et traçables',
    icon: 'shield',
  },
  {
    title: 'Assistance dédiée',
    description: 'Accompagnement commercial & devis',
    icon: 'headset',
  },
];

export const TOP_BAR_ITEMS = [
  'Livraison professionnelle',
  'Commandes B2B',
  'Maroc · Afrique · Moyen-Orient',
] as const;

export const TOP_BAR_PHONE = '+212 661-52-86-08';

export type DockCategory = {
  n: string;
  nameFr: string;
  slugFr: string;
  imageUrl: string;
};

export const DOCK_CATEGORIES: DockCategory[] = [
  {
    n: '01',
    nameFr: 'Épices',
    slugFr: 'epices',
    imageUrl: '/categories/epices.png',
  },
  {
    n: '02',
    nameFr: 'Fruits secs',
    slugFr: 'fruits-secs',
    imageUrl: '/categories/fruits-secs.png',
  },
  {
    n: '03',
    nameFr: 'Légumineuses',
    slugFr: 'legumineuses',
    imageUrl: '/categories/legumineuses.png',
  },
  {
    n: '04',
    nameFr: 'Céréales & pâtes',
    slugFr: 'cereales-riz-pates',
    imageUrl: '/categories/cereales.png',
  },
  {
    n: '05',
    nameFr: 'Fruits & légumes',
    slugFr: 'fruits-legumes',
    imageUrl: '/categories/fruits-legumes.png',
  },
  {
    n: '06',
    nameFr: 'Hygiène',
    slugFr: 'hygiene',
    imageUrl: '/categories/hygiene.png',
  },
];
