import { useEffect, useMemo, useState } from 'react';
import { api, type Category } from '@/lib/api';
import {
  buildCategoryDisplays,
  buildCategoryDisplaysWithFallback,
} from '@/lib/category-display';

export type PublicCategoryNavItem = {
  id: string;
  slugFr: string;
  nameFr: string;
};

export type PublicCategoryFilterItem = PublicCategoryNavItem & {
  count: number;
};

/** Catégories racines pour la navigation. */
export function rootNavCategories(categories: Category[]): PublicCategoryNavItem[] {
  return categories.map((cat) => ({
    id: cat.id,
    slugFr: cat.slugFr,
    nameFr: cat.nameFr,
  }));
}

/** Racines + sous-catégories actives pour les filtres catalogue. */
export function flattenFilterCategories(categories: Category[]): PublicCategoryNavItem[] {
  const items: PublicCategoryNavItem[] = [];
  for (const cat of categories) {
    items.push({ id: cat.id, slugFr: cat.slugFr, nameFr: cat.nameFr });
    for (const child of cat.children ?? []) {
      items.push({ id: child.id, slugFr: child.slugFr, nameFr: child.nameFr });
    }
  }
  return items;
}

export function mergeCategoryFacetCounts(
  categories: Category[],
  facetCategories?: Array<{ slugFr: string; count: number }> | null,
): PublicCategoryFilterItem[] {
  const countBySlug = new Map(
    (facetCategories ?? []).map((c) => [c.slugFr, c.count]),
  );
  return flattenFilterCategories(categories).map((cat) => ({
    ...cat,
    count: countBySlug.get(cat.slugFr) ?? 0,
  }));
}

export function useHomeSpotlightCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<Category[]>('/categories/spotlight', {
          auth: false,
        });
        if (!cancelled) setCategories(data);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    categories,
    loading,
    displayItems: useMemo(() => buildCategoryDisplays(categories), [categories]),
  };
}

export function usePublicCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<Category[]>('/categories', { auth: false });
        if (!cancelled) setCategories(data);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    categories,
    loading,
    navItems: rootNavCategories(categories),
    displayItems: useMemo(
      () => buildCategoryDisplaysWithFallback(categories),
      [categories],
    ),
  };
}
