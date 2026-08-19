import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { ProductCard } from '@/components/ProductCard';
import { api, mediaUrl, type Brand, type ProductsResponse } from '@/lib/api';

async function getData(slug: string) {
  try {
    const brand = await api<Brand>(`/brands/${slug}`, { auth: false });
    const res = await api<ProductsResponse>(
      `/search?brand=${encodeURIComponent(slug)}&limit=24`,
      { auth: false },
    ).catch(async () =>
      api<ProductsResponse>(`/products?limit=48`, { auth: false }),
    );
    const products = (res.items ?? []).filter(
      (p) => p.brand?.slugFr === slug || p.brand?.name === brand.name,
    );
    return { brand, products };
  } catch {
    return null;
  }
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();

  const banner = mediaUrl(data.brand.bannerUrl);

  return (
    <div>
      {banner ? (
        <div style={{ height: 220, background: `center/cover url(${banner})` }} />
      ) : null}
      <div className="container section">
        <PageHeader
          eyebrow="Marque"
          title={data.brand.name}
          subtitle={data.brand.descriptionFr ?? undefined}
        />
        <div className="product-grid">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {data.products.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Aucun produit pour cette marque.</p>
        ) : null}
      </div>
    </div>
  );
}
