import { HomeHeroSection } from '@/components/home/HeroSection';
import { HomeCategoriesEditorial } from '@/components/home/HomeCategoriesEditorial';
import { HomeOffersSection } from '@/components/home/HomeOffersSection';
import { BrandPromoSection } from '@/components/home/BrandPromoSection';
import { HomePresentationSection } from '@/components/home/HomePresentationSection';
import { api, type ProductsResponse } from '@/lib/api';

async function getHomeData() {
  const emptyProducts: ProductsResponse = {
    items: [],
    meta: { total: 0, page: 1, limit: 8, pages: 0 },
  };

  try {
    const [promos, nouveautes] = await Promise.all([
      api<ProductsResponse>('/products?promo=true&limit=8', { auth: false }),
      api<ProductsResponse>('/products?new=true&limit=8', { auth: false }),
    ]);
    return { promos, nouveautes };
  } catch {
    return { promos: emptyProducts, nouveautes: emptyProducts };
  }
}

export default async function HomePage() {
  const { promos, nouveautes } = await getHomeData();

  return (
    <>
      <HomeHeroSection />

      <HomeCategoriesEditorial />

      <HomeOffersSection
        items={promos.items}
        emptyMessage="Aucune promotion pour le moment."
      />

      <BrandPromoSection />

      <HomeOffersSection
        title="Dernières arrivées"
        description="Produits marqués « Nouveau » dans le catalogue."
        href="/catalogue?sort=new"
        linkLabel="Tout voir"
        items={nouveautes.items}
        emptyMessage="Cochez « Nouveau » sur une fiche produit pour l’afficher ici."
        titleId="home-arrivals-title"
        markFirstAsFeatured={false}
        showNewBadge
        eyebrow=""
      />

      <HomePresentationSection />
    </>
  );
}
