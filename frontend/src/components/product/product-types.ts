export type ProductPurchaseMode = 'DIRECT' | 'QUOTE' | 'HYBRID';

export type ProductDetailImage = {
  id?: string;
  url: string;
  altFr?: string | null;
  altEn?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type ProductDetailVariant = {
  id: string;
  sku: string;
  nameFr: string;
  nameEn: string;
  attributes?: Record<string, unknown> | null;
  price?: string | number | null;
  stockQty: number;
  weightKg?: string | number | null;
  imageUrl?: string | null;
  isActive: boolean;
};

export type ProductDetail = {
  id: string;
  sku: string;
  slugFr: string;
  slugEn: string;
  nameFr: string;
  nameEn: string;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  purchaseMode: ProductPurchaseMode;
  hybridThresholdQty?: number | null;
  price: string | number;
  promoPrice?: string | number | null;
  currency: string;
  weightKg?: string | number | null;
  volumeMl?: string | number | null;
  packaging?: string | null;
  unitsPerCarton?: number | null;
  originCountry?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  nutritionInfo?: Record<string, unknown> | null;
  storageConditions?: string | null;
  stockQty: number;
  isActive: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  createdAt?: string;
  ratingsAvg?: string | number | null;
  ratingsCount?: number | null;
  images: ProductDetailImage[];
  variants: ProductDetailVariant[];
  brand?: {
    id: string;
    name: string;
    slugFr: string;
    slugEn?: string;
  } | null;
  category: {
    id: string;
    nameFr: string;
    nameEn?: string;
    slugFr: string;
    slugEn?: string;
  };
  seo?: {
    title?: string | null;
    description?: string | null;
    slug?: string;
    ogImage?: string | null;
  };
  jsonLd?: Record<string, unknown>;
};

export type ProductListLite = {
  id: string;
  sku: string;
  slugFr: string;
  slugEn: string;
  nameFr: string;
  nameEn: string;
  price: string | number;
  promoPrice?: string | number | null;
  currency: string;
  stockQty: number;
  packaging?: string | null;
  ratingsAvg?: string | number;
  ratingsCount?: number;
  images?: Array<{ url: string; isPrimary?: boolean; altFr?: string | null }>;
  category?: { nameFr: string; slugFr: string };
  brand?: { name: string; slugFr: string } | null;
};
