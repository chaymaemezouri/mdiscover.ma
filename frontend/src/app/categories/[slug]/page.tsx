import { redirect } from 'next/navigation';
import { catalogueCategoryHref } from '@/lib/home-categories';

export default async function CategorySlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(catalogueCategoryHref(slug));
}
