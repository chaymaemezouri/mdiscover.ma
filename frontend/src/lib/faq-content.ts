export type FaqCategoryId =
  | 'all'
  | 'products'
  | 'b2b'
  | 'import-export'
  | 'quality'
  | 'orders';

export type FaqCategory = {
  id: FaqCategoryId;
  label: string;
};

export type FaqLink = {
  href: string;
  label: string;
  /** Lien réservé aux comptes pro (devis) */
  proOnly?: boolean;
};

export type FaqItem = {
  id: string;
  category: Exclude<FaqCategoryId, 'all'>;
  question: string;
  answer: string;
  links?: FaqLink[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  { id: 'all', label: 'Tout' },
  { id: 'products', label: 'Produits' },
  { id: 'b2b', label: 'B2B & volumes' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'quality', label: 'Qualité' },
  { id: 'orders', label: 'Commandes & devis' },
];

export const FAQ_INTRO =
  'MDISCOVER IMPEX FOOD accompagne producteurs, fournisseurs et acheteurs dans le commerce international de produits agroalimentaires grâce à des solutions fiables de sourcing, d’approvisionnement et de logistique.';

export const FAQ_TRUST_STATS = [
  { value: '15+', label: 'Années d’expérience' },
  { value: 'B2B', label: 'Approvisionnement professionnel' },
  { value: 'International', label: 'Maroc · Afrique · Moyen-Orient' },
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'products',
    category: 'products',
    question: 'Quels produits proposez-vous ?',
    answer:
      'Nous proposons une large gamme de produits agroalimentaires : sucre, blé, riz, huiles alimentaires, légumineuses, fruits secs, épices, fruits et légumes, ainsi qu’une sélection de produits du terroir marocain.',
  },
  {
    id: 'b2b',
    category: 'b2b',
    question: 'Travaillez-vous avec les grossistes et clients B2B ?',
    answer:
      'Oui. Nous sommes spécialisés dans l’approvisionnement B2B et les volumes professionnels pour les distributeurs, importateurs, détaillants et clients industriels. Les volumes et conditions peuvent être adaptés selon les besoins.',
    links: [{ href: '/devis', label: 'Demander un devis', proOnly: true }],
  },
  {
    id: 'shipping',
    category: 'import-export',
    question: 'Proposez-vous la livraison internationale ?',
    answer:
      'Oui. MDISCOVER accompagne les opérations d’import-export et propose des solutions logistiques pour le Maroc, l’Afrique, le Moyen-Orient et d’autres marchés internationaux, selon les produits et la destination.',
  },
  {
    id: 'quality',
    category: 'quality',
    question: 'Comment assurez-vous la qualité des produits ?',
    answer:
      'Nous travaillons avec des fournisseurs sélectionnés et appliquons des exigences de qualité et de conformité adaptées aux produits et aux marchés concernés. Les contrôles et documents disponibles dépendent de chaque référence et de sa destination.',
  },
  {
    id: 'custom-sourcing',
    category: 'b2b',
    question: 'Puis-je demander une commande ou un sourcing personnalisé ?',
    answer:
      'Oui. Nous pouvons étudier des demandes spécifiques selon le produit recherché, les volumes, le conditionnement et la destination.',
    links: [
      {
        href: '/devis',
        label: 'Demander un sourcing sur mesure',
        proOnly: true,
      },
    ],
  },
  {
    id: 'order-quote',
    category: 'orders',
    question: 'Comment passer une commande ou demander un devis ?',
    answer:
      'Pour les références disponibles, vous pouvez ajouter les produits au panier et finaliser votre commande directement sur le site. Pour les volumes professionnels, l’export ou les besoins spécifiques, utilisez notre formulaire de demande de devis.',
    links: [
      { href: '/catalogue', label: 'Voir le catalogue' },
      { href: '/devis', label: 'Demander un devis', proOnly: true },
    ],
  },
  {
    id: 'cart-to-quote',
    category: 'orders',
    question:
      'Puis-je importer les produits de mon panier dans une demande de devis ?',
    answer:
      'Oui. Sur la page de demande de devis, le bouton « Importer mon panier » reprend les articles de votre panier pour accélérer votre demande professionnelle.',
    links: [{ href: '/devis', label: 'Demander un devis', proOnly: true }],
  },
  {
    id: 'payment',
    category: 'orders',
    question: 'Quels moyens de paiement acceptez-vous ?',
    answer:
      'Lors du passage de commande sur le site, vous pouvez choisir le paiement bancaire (virement) ou le paiement à la livraison, selon les options disponibles au moment de la validation.',
  },
  {
    id: 'shipping-fees',
    category: 'orders',
    question: 'Comment sont calculés les frais de livraison ?',
    answer:
      'Les frais de livraison ne sont pas facturés sur le site. Ils se règlent directement avec le livreur au moment de la livraison.',
  },
  {
    id: 'international-order',
    category: 'import-export',
    question: 'Puis-je commander depuis l’étranger ?',
    answer:
      'Les commandes en ligne sur le site sont principalement destinées à la livraison au Maroc. Pour un besoin à l’international (export, import ou volumes B2B), contactez notre équipe ou demandez un devis afin d’étudier la destination et les conditions adaptées.',
    links: [
      { href: '/contact', label: 'Contacter MDISCOVER' },
      { href: '/devis', label: 'Demander un devis', proOnly: true },
    ],
  },
];
