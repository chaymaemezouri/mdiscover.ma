import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductSort, SearchProductsDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchProductsDto) {
    const requestedPage = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where = this.buildWhere(dto);
    const orderBy = this.buildOrderBy(dto.sort ?? ProductSort.NEWEST);

    const [total, facets] = await Promise.all([
      this.prisma.product.count({ where }),
      this.buildFacets(dto),
    ]);

    const pages = Math.ceil(total / limit) || 0;
    const page =
      pages > 0 ? Math.min(Math.max(requestedPage, 1), pages) : 1;

    const items = await this.prisma.product.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slugFr: true,
            slugEn: true,
          },
        },
        category: {
          select: {
            id: true,
            nameFr: true,
            nameEn: true,
            slugFr: true,
            slugEn: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: {
            url: true,
            altFr: true,
            altEn: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const locale = dto.locale ?? 'fr';

    return {
      items: items.map((p) => ({
        id: p.id,
        sku: p.sku,
        slug: locale === 'en' ? p.slugEn : p.slugFr,
        name: locale === 'en' ? p.nameEn : p.nameFr,
        description:
          locale === 'en' ? p.descriptionEn : p.descriptionFr,
        price: Number(p.price),
        promoPrice: p.promoPrice != null ? Number(p.promoPrice) : null,
        effectivePrice: Number(p.promoPrice ?? p.price),
        currency: p.currency,
        originCountry: p.originCountry,
        stockQty: p.stockQty,
        inStock: p.stockQty > 0,
        onPromo: p.promoPrice != null,
        isNew: p.isNew,
        purchaseMode: p.purchaseMode,
        packaging: p.packaging ?? null,
        unitsPerCarton: p.unitsPerCarton ?? null,
        hybridThresholdQty: p.hybridThresholdQty ?? null,
        ratingsAvg: Number(p.ratingsAvg),
        ratingsCount: p.ratingsCount,
        salesCount: p.salesCount,
        createdAt: p.createdAt,
        brand: p.brand,
        category: p.category,
        image: p.images[0] ?? null,
        seo: {
          title: (locale === 'en' ? p.seoTitleEn : p.seoTitleFr) ?? undefined,
          description:
            (locale === 'en' ? p.seoDescriptionEn : p.seoDescriptionFr) ??
            undefined,
        },
      })),
      facets,
      meta: {
        total,
        page,
        limit,
        pages,
        sort: dto.sort ?? ProductSort.NEWEST,
        q: dto.q ?? null,
      },
    };
  }

  async suggest(q: string, limit = 8) {
    const term = q?.trim();
    if (!term || term.length < 2) {
      return { products: [], categories: [], brands: [] };
    }

    const [products, categories, brands] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { nameFr: { contains: term, mode: 'insensitive' } },
            { nameEn: { contains: term, mode: 'insensitive' } },
            { sku: { contains: term, mode: 'insensitive' } },
            { keywords: { has: term.toLowerCase() } },
          ],
        },
        select: {
          id: true,
          sku: true,
          slugFr: true,
          slugEn: true,
          nameFr: true,
          nameEn: true,
          price: true,
          promoPrice: true,
          currency: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
        },
        take: limit,
        orderBy: { salesCount: 'desc' },
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          OR: [
            { nameFr: { contains: term, mode: 'insensitive' } },
            { nameEn: { contains: term, mode: 'insensitive' } },
            { slugFr: { contains: term, mode: 'insensitive' } },
            { slugEn: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          slugFr: true,
          slugEn: true,
          nameFr: true,
          nameEn: true,
          _count: { select: { products: true } },
        },
        take: 5,
      }),
      this.prisma.brand.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { slugFr: { contains: term, mode: 'insensitive' } },
            { slugEn: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          slugFr: true,
          slugEn: true,
          _count: { select: { products: true } },
        },
        take: 5,
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        slugFr: p.slugFr,
        slugEn: p.slugEn,
        nameFr: p.nameFr,
        nameEn: p.nameEn,
        price: Number(p.price),
        promoPrice: p.promoPrice != null ? Number(p.promoPrice) : null,
        currency: p.currency,
        image: p.images[0] ?? null,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        slugFr: c.slugFr,
        slugEn: c.slugEn,
        nameFr: c.nameFr,
        nameEn: c.nameEn,
        count: c._count.products,
      })),
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        slugFr: b.slugFr,
        slugEn: b.slugEn,
        count: b._count.products,
      })),
    };
  }

  private buildWhere(dto: SearchProductsDto): Prisma.ProductWhereInput {
    const and: Prisma.ProductWhereInput[] = [{ isActive: true }];

    if (dto.q?.trim()) {
      const q = dto.q.trim();
      and.push({
        OR: [
          { nameFr: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
          { descriptionFr: { contains: q, mode: 'insensitive' } },
          { descriptionEn: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { keywords: { has: q.toLowerCase() } },
          { originCountry: { contains: q, mode: 'insensitive' } },
          {
            category: {
              OR: [
                { nameFr: { contains: q, mode: 'insensitive' } },
                { nameEn: { contains: q, mode: 'insensitive' } },
                { slugFr: { contains: q, mode: 'insensitive' } },
                { slugEn: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
          {
            brand: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slugFr: { contains: q, mode: 'insensitive' } },
                { slugEn: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        ],
      });
    }

    if (dto.sku?.trim()) {
      and.push({ sku: { contains: dto.sku.trim(), mode: 'insensitive' } });
    }

    if (dto.category?.trim()) {
      const category = dto.category.trim();
      and.push({
        category: {
          isActive: true,
          OR: [
            { slugFr: category },
            { slugEn: category },
            { id: category },
          ],
        },
      });
    }

    if (dto.brand?.trim()) {
      const brand = dto.brand.trim();
      and.push({
        brand: {
          isActive: true,
          OR: [{ slugFr: brand }, { slugEn: brand }, { id: brand }],
        },
      });
    }

    if (dto.origin?.trim()) {
      and.push({
        originCountry: {
          equals: dto.origin.trim(),
          mode: 'insensitive',
        },
      });
    }

    if (dto.minPrice != null || dto.maxPrice != null) {
      and.push({
        OR: [
          {
            AND: [
              { promoPrice: { not: null } },
              {
                promoPrice: {
                  ...(dto.minPrice != null ? { gte: dto.minPrice } : {}),
                  ...(dto.maxPrice != null ? { lte: dto.maxPrice } : {}),
                },
              },
            ],
          },
          {
            AND: [
              { promoPrice: null },
              {
                price: {
                  ...(dto.minPrice != null ? { gte: dto.minPrice } : {}),
                  ...(dto.maxPrice != null ? { lte: dto.maxPrice } : {}),
                },
              },
            ],
          },
        ],
      });
    }

    if (dto.minRating != null) {
      and.push({ ratingsAvg: { gte: dto.minRating } });
      and.push({ ratingsCount: { gt: 0 } });
    }

    if (dto.inStock === true) {
      and.push({ stockQty: { gt: 0 } });
    } else if (dto.inStock === false) {
      and.push({ stockQty: { lte: 0 } });
    }

    if (dto.onPromo === true) {
      and.push({ promoPrice: { not: null } });
    } else if (dto.onPromo === false) {
      and.push({ promoPrice: null });
    }

    if (dto.isNew === true) {
      and.push({ isNew: true });
    } else if (dto.isNew === false) {
      and.push({ isNew: false });
    }

    if (dto.purchaseMode) {
      and.push({ purchaseMode: dto.purchaseMode });
    }

    return { AND: and };
  }

  private buildOrderBy(
    sort: ProductSort,
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return [{ price: 'asc' }, { createdAt: 'desc' }];
      case ProductSort.PRICE_DESC:
        return [{ price: 'desc' }, { createdAt: 'desc' }];
      case ProductSort.POPULARITY:
        return [
          { ratingsCount: 'desc' },
          { ratingsAvg: 'desc' },
          { salesCount: 'desc' },
        ];
      case ProductSort.BEST_RATED:
        return [{ ratingsAvg: 'desc' }, { ratingsCount: 'desc' }];
      case ProductSort.BEST_SELLERS:
        return [{ salesCount: 'desc' }, { createdAt: 'desc' }];
      case ProductSort.NEWEST:
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  private async buildFacets(dto: SearchProductsDto) {
    // Les facettes catégorie / marque s’excluent elles-mêmes pour permettre
    // de changer de valeur sans d’abord tout désélectionner.
    const contextualWhere = this.buildWhere(dto);
    const categoryWhere = this.buildWhere({ ...dto, category: undefined });
    const brandWhere = this.buildWhere({ ...dto, brand: undefined });

    const [contextual, forCategories, forBrands] = await Promise.all([
      this.prisma.product.findMany({
        where: contextualWhere,
        select: {
          originCountry: true,
          promoPrice: true,
          stockQty: true,
          price: true,
        },
        take: 1000,
      }),
      this.prisma.product.findMany({
        where: categoryWhere,
        select: {
          categoryId: true,
          category: {
            select: {
              id: true,
              nameFr: true,
              nameEn: true,
              slugFr: true,
              slugEn: true,
            },
          },
        },
        take: 1000,
      }),
      this.prisma.product.findMany({
        where: brandWhere,
        select: {
          brandId: true,
          brand: {
            select: { id: true, name: true, slugFr: true, slugEn: true },
          },
        },
        take: 1000,
      }),
    ]);

    const origins = new Map<string, number>();
    const brands = new Map<
      string,
      { count: number; brand: NonNullable<(typeof forBrands)[0]['brand']> }
    >();
    const categories = new Map<
      string,
      {
        count: number;
        category: NonNullable<(typeof forCategories)[0]['category']>;
      }
    >();
    let onPromo = 0;
    let inStock = 0;
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;

    for (const p of contextual) {
      const effective = Number(p.promoPrice ?? p.price);
      if (effective < minPrice) minPrice = effective;
      if (effective > maxPrice) maxPrice = effective;
      if (p.promoPrice != null) onPromo += 1;
      if (p.stockQty > 0) inStock += 1;
      if (p.originCountry) {
        origins.set(
          p.originCountry,
          (origins.get(p.originCountry) ?? 0) + 1,
        );
      }
    }

    for (const p of forCategories) {
      if (!p.category) continue;
      const prev = categories.get(p.category.id);
      categories.set(p.category.id, {
        count: (prev?.count ?? 0) + 1,
        category: p.category,
      });
    }

    for (const p of forBrands) {
      if (!p.brand) continue;
      const prev = brands.get(p.brand.id);
      brands.set(p.brand.id, {
        count: (prev?.count ?? 0) + 1,
        brand: p.brand,
      });
    }

    return {
      priceRange: {
        min: Number.isFinite(minPrice) ? minPrice : 0,
        max: maxPrice,
      },
      counts: {
        total: contextual.length,
        onPromo,
        inStock,
      },
      origins: [...origins.entries()]
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count),
      brands: [...brands.values()]
        .map(({ brand, count }) => ({ ...brand, count }))
        .sort((a, b) => b.count - a.count),
      categories: [...categories.values()]
        .map(({ category, count }) => ({ ...category, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
