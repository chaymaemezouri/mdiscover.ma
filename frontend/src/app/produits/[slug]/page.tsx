import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import type { ProductDetail } from '@/components/product/product-types';
import {
  mapSearchItemToProduct,
  type SearchResponse,
} from '@/app/catalogue/catalogue-data';
import { api, mediaUrl, type ProductListItem } from '@/lib/api';
import './product-detail.css';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await api<ProductDetail>(`/products/${slug}?locale=fr`, {
      auth: false,
    });
  } catch {
    return null;
  }
}

async function fetchSimilar(
  categorySlug: string | undefined,
  excludeId: string,
): Promise<ProductListItem[]> {
  if (!categorySlug) return [];
  try {
    const res = await api<SearchResponse>(
      `/search?category=${encodeURIComponent(categorySlug)}&limit=8`,
      { auth: false },
    );
    return (res.items ?? [])
      .map(mapSearchItemToProduct)
      .filter((p) => p.id !== excludeId)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) {
    return { title: 'Produit introuvable | DISCOVER' };
  }

  const title =
    product.seo?.title?.trim() || `${product.nameFr} | DISCOVER`;
  const description =
    product.seo?.description?.trim() ||
    product.descriptionFr?.slice(0, 160) ||
    `${product.nameFr} — catalogue DISCOVER`;

  const ogImagePath =
    product.seo?.ogImage ||
    product.images?.find((i) => i.isPrimary)?.url ||
    product.images?.[0]?.url;
  const ogImage = mediaUrl(ogImagePath) ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const similar = await fetchSimilar(product.category?.slugFr, product.id);

  return (
    <>
      {product.jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(product.jsonLd),
          }}
        />
      ) : null}
      <ProductDetailClient product={product} similar={similar} />
    </>
  );
}
