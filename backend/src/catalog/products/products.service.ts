import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseMode } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AuthUser } from '../../common/decorators/auth.decorators';
import { SlugService } from '../../common/utils/slug.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdjustStockDto,
  CreateLotDto,
  CreateProductDto,
  ProductImageInputDto,
  UpdateProductDto,
} from './dto/product.dto';

const productInclude = {
  brand: true,
  category: true,
  images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
  variants: { where: { isActive: true } },
  lots: { orderBy: { expiryDate: 'asc' as const } },
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slug: SlugService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateProductDto, admin: AuthUser) {
    await this.ensureCategory(dto.categoryId);
    if (dto.brandId) {
      await this.ensureBrand(dto.brandId);
    }
    if (dto.purchaseMode === PurchaseMode.HYBRID && !dto.hybridThresholdQty) {
      throw new BadRequestException(
        'hybridThresholdQty is required for HYBRID purchase mode',
      );
    }

    const nameEn = dto.nameEn?.trim() || dto.nameFr;
    const descriptionEn = dto.descriptionEn ?? dto.descriptionFr;
    const sku = await this.resolveSku(dto.sku, dto.nameFr);

    const slugs = await this.prisma.product.findMany({
      select: { slugFr: true, slugEn: true },
    });
    const slugFr =
      dto.slugFr ??
      this.slug.unique(
        dto.nameFr,
        slugs.map((p) => p.slugFr),
      );
    const slugEn =
      dto.slugEn ??
      this.slug.unique(
        nameEn,
        slugs.map((p) => p.slugEn),
      );
    await this.ensureProductSlugsFree(slugFr, slugEn);

    const product = await this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        sku,
        slugFr,
        slugEn,
        nameFr: dto.nameFr,
        nameEn,
        descriptionFr: dto.descriptionFr,
        descriptionEn,
        purchaseMode: dto.purchaseMode ?? PurchaseMode.DIRECT,
        hybridThresholdQty: dto.hybridThresholdQty,
        price: dto.price,
        promoPrice: dto.promoPrice,
        currency: dto.currency ?? 'MAD',
        weightKg: dto.weightKg,
        volumeMl: dto.volumeMl,
        packaging: dto.packaging,
        unitsPerCarton: dto.unitsPerCarton,
        originCountry: dto.originCountry,
        ingredients: dto.ingredients,
        allergens: dto.allergens,
        nutritionInfo: dto.nutritionInfo as Prisma.InputJsonValue | undefined,
        storageConditions: dto.storageConditions,
        stockQty: dto.stockQty ?? 0,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        isNew: dto.isNew ?? false,
        keywords: dto.keywords?.length
          ? dto.keywords
          : this.keywordsFromName(dto.nameFr),
        seoTitleFr: dto.seoTitleFr ?? dto.nameFr,
        seoTitleEn: dto.seoTitleEn ?? nameEn,
        seoDescriptionFr:
          dto.seoDescriptionFr ??
          this.seoSnippet(dto.descriptionFr, dto.nameFr),
        seoDescriptionEn:
          dto.seoDescriptionEn ?? this.seoSnippet(descriptionEn, nameEn),
        ogImageUrl: dto.ogImageUrl,
        images: dto.images?.length
          ? { create: this.mapImages(dto.images) }
          : undefined,
        variants: dto.variants?.length
          ? {
              create: dto.variants.map((v) => ({
                sku: v.sku,
                nameFr: v.nameFr,
                nameEn: v.nameEn,
                attributes: v.attributes as Prisma.InputJsonValue | undefined,
                price: v.price,
                stockQty: v.stockQty ?? 0,
                weightKg: v.weightKg,
                imageUrl: v.imageUrl,
                isActive: v.isActive ?? true,
              })),
            }
          : undefined,
      },
      include: productInclude,
    });

    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      metadata: { sku: product.sku },
    });

    return this.withStructuredData(product, 'fr');
  }

  async findAllPublic(params?: {
    categorySlug?: string;
    brandSlug?: string;
    promo?: boolean;
    featured?: boolean;
    isNew?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 20, 100);
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (params?.categorySlug) {
      where.category = {
        OR: [
          { slugFr: params.categorySlug },
          { slugEn: params.categorySlug },
        ],
        isActive: true,
      };
    }
    if (params?.brandSlug) {
      where.brand = {
        OR: [{ slugFr: params.brandSlug }, { slugEn: params.brandSlug }],
        isActive: true,
      };
    }
    if (params?.promo) {
      where.promoPrice = { not: null };
    }
    if (params?.featured) {
      where.isFeatured = true;
    }
    if (params?.isNew) {
      where.isNew = true;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          brand: true,
          category: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string, locale: 'fr' | 'en' = 'fr') {
    const product = await this.prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [{ slugFr: slug }, { slugEn: slug }],
      },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.withStructuredData(product, locale);
  }

  async findAllAdmin() {
    return this.prisma.product.findMany({
      include: productInclude,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, admin: AuthUser) {
    const current = await this.ensureProduct(id);
    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }
    if (dto.brandId) {
      await this.ensureBrand(dto.brandId);
    }
    if (dto.sku) {
      const skuClash = await this.prisma.product.findFirst({
        where: { sku: dto.sku, NOT: { id } },
      });
      if (skuClash) {
        throw new ConflictException(`SKU already exists: ${dto.sku}`);
      }
    }
    if (dto.purchaseMode === PurchaseMode.HYBRID && !dto.hybridThresholdQty) {
      if (!current.hybridThresholdQty && !dto.hybridThresholdQty) {
        throw new BadRequestException(
          'hybridThresholdQty is required for HYBRID purchase mode',
        );
      }
    }

    const nameFr = dto.nameFr ?? current.nameFr;
    const nameEn = dto.nameEn ?? nameFr;
    const descriptionFr =
      dto.descriptionFr !== undefined ? dto.descriptionFr : current.descriptionFr;
    const descriptionEn =
      dto.descriptionEn !== undefined ? dto.descriptionEn : descriptionFr;

    let slugFr = dto.slugFr;
    let slugEn = dto.slugEn;
    if (
      !slugFr &&
      dto.nameFr &&
      dto.nameFr !== current.nameFr &&
      this.looksAutoGenerated(current.slugFr, current.nameFr)
    ) {
      const slugs = await this.prisma.product.findMany({
        where: { NOT: { id } },
        select: { slugFr: true, slugEn: true },
      });
      slugFr = this.slug.unique(
        nameFr,
        slugs.map((p) => p.slugFr),
      );
      if (!slugEn && this.looksAutoGenerated(current.slugEn, current.nameEn)) {
        slugEn = this.slug.unique(
          nameEn,
          slugs.map((p) => p.slugEn),
        );
      }
    }
    if (slugFr || slugEn) {
      await this.ensureProductSlugsFree(slugFr, slugEn, id);
    }

    const data: Prisma.ProductUpdateInput = {
      sku: dto.sku,
      nameFr: dto.nameFr,
      nameEn: dto.nameEn ?? (dto.nameFr ? nameEn : undefined),
      slugFr,
      slugEn,
      descriptionFr: dto.descriptionFr,
      descriptionEn:
        dto.descriptionEn ?? (dto.descriptionFr !== undefined ? descriptionEn : undefined),
      purchaseMode: dto.purchaseMode,
      hybridThresholdQty: dto.hybridThresholdQty,
      price: dto.price,
      promoPrice: dto.promoPrice === null ? null : dto.promoPrice,
      currency: dto.currency,
      weightKg: dto.weightKg,
      volumeMl: dto.volumeMl,
      packaging: dto.packaging,
      unitsPerCarton: dto.unitsPerCarton,
      originCountry: dto.originCountry,
      ingredients: dto.ingredients,
      allergens: dto.allergens,
      nutritionInfo: dto.nutritionInfo as Prisma.InputJsonValue | undefined,
      storageConditions: dto.storageConditions,
      stockQty: dto.stockQty,
      isActive: dto.isActive,
      isFeatured: dto.isFeatured,
      isNew: dto.isNew,
      keywords: dto.keywords ?? (dto.nameFr ? this.keywordsFromName(nameFr) : undefined),
      seoTitleFr: dto.seoTitleFr ?? (dto.nameFr ? nameFr : undefined),
      seoTitleEn: dto.seoTitleEn ?? (dto.nameFr || dto.nameEn ? nameEn : undefined),
      seoDescriptionFr:
        dto.seoDescriptionFr ??
        (dto.nameFr || dto.descriptionFr !== undefined
          ? this.seoSnippet(descriptionFr, nameFr)
          : undefined),
      seoDescriptionEn:
        dto.seoDescriptionEn ??
        (dto.nameFr || dto.descriptionFr !== undefined || dto.descriptionEn !== undefined
          ? this.seoSnippet(descriptionEn, nameEn)
          : undefined),
      ogImageUrl: dto.ogImageUrl,
    };

    if (dto.categoryId) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.brandId === null) {
      data.brand = { disconnect: true };
    } else if (dto.brandId) {
      data.brand = { connect: { id: dto.brandId } };
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    });

    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: id,
    });

    return product;
  }

  async softDeactivate(id: string, admin: AuthUser) {
    await this.ensureProduct(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_DEACTIVATED',
      entity: 'Product',
      entityId: id,
    });
    return product;
  }

  async remove(id: string, admin: AuthUser) {
    await this.ensureProduct(id);
    const [orderLinks, quoteLinks] = await Promise.all([
      this.prisma.orderItem.count({ where: { productId: id } }),
      this.prisma.quoteItem.count({ where: { productId: id } }),
    ]);
    if (orderLinks + quoteLinks > 0) {
      const product = await this.softDeactivate(id, admin);
      return { ...product, removed: false, deactivated: true };
    }

    await this.prisma.cartItem.deleteMany({ where: { productId: id } });
    await this.prisma.product.delete({ where: { id } });
    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: id,
    });
    return { id, removed: true };
  }

  async addImages(productId: string, images: ProductImageInputDto[], admin: AuthUser) {
    await this.ensureProduct(productId);
    if (images.some((i) => i.isPrimary)) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }
    await this.prisma.productImage.createMany({
      data: images.map((img) => ({
        productId,
        ...this.mapImages([img])[0],
      })),
    });
    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_IMAGES_ADDED',
      entity: 'Product',
      entityId: productId,
    });
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
  }

  async removeImage(productId: string, imageId: string, admin: AuthUser) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) {
      throw new NotFoundException('Image not found');
    }
    await this.prisma.productImage.delete({ where: { id: imageId } });
    if (image.isPrimary) {
      const next = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await this.prisma.productImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
        await this.prisma.product.update({
          where: { id: productId },
          data: { ogImageUrl: next.url },
        });
      }
    }
    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_IMAGE_REMOVED',
      entity: 'Product',
      entityId: productId,
      metadata: { imageId },
    });
    return this.findOneAdmin(productId);
  }

  async setPrimaryImage(productId: string, imageId: string, admin: AuthUser) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) {
      throw new NotFoundException('Image not found');
    }
    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: { ogImageUrl: image.url },
      }),
    ]);
    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_IMAGE_PRIMARY',
      entity: 'Product',
      entityId: productId,
      metadata: { imageId },
    });
    return this.findOneAdmin(productId);
  }

  async addLot(productId: string, dto: CreateLotDto, admin: AuthUser) {
    await this.ensureProduct(productId);
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId },
      });
      if (!variant) {
        throw new NotFoundException('Variant not found for product');
      }
    }

    const lot = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productLot.create({
        data: {
          productId,
          variantId: dto.variantId,
          lotNumber: dto.lotNumber,
          expiryDate: new Date(dto.expiryDate),
          quantity: dto.quantity,
        },
      });

      if (dto.variantId) {
        await tx.productVariant.update({
          where: { id: dto.variantId },
          data: { stockQty: { increment: dto.quantity } },
        });
      }
      await tx.product.update({
        where: { id: productId },
        data: { stockQty: { increment: dto.quantity } },
      });

      return created;
    });

    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_LOT_ADDED',
      entity: 'ProductLot',
      entityId: lot.id,
      metadata: { productId, lotNumber: dto.lotNumber, quantity: dto.quantity },
    });

    return lot;
  }

  async adjustStock(productId: string, dto: AdjustStockDto, admin: AuthUser) {
    const product = await this.ensureProduct(productId);

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId },
      });
      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
      if (variant.stockQty + dto.delta < 0) {
        throw new BadRequestException('Insufficient variant stock');
      }
    } else if (product.stockQty + dto.delta < 0) {
      throw new BadRequestException('Insufficient product stock');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.variantId) {
        await tx.productVariant.update({
          where: { id: dto.variantId },
          data: { stockQty: { increment: dto.delta } },
        });
      }
      await tx.product.update({
        where: { id: productId },
        data: { stockQty: { increment: dto.delta } },
      });
    });

    await this.audit.log({
      userId: admin.id,
      action: 'PRODUCT_STOCK_ADJUSTED',
      entity: 'Product',
      entityId: productId,
      metadata: {
        delta: dto.delta,
        variantId: dto.variantId,
        reason: dto.reason,
      },
    });

    return this.prisma.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
  }

  async listExpiringLots(withinDays = 30) {
    const until = new Date();
    until.setDate(until.getDate() + withinDays);

    return this.prisma.productLot.findMany({
      where: {
        expiryDate: { lte: until },
        quantity: { gt: 0 },
      },
      include: {
        product: { select: { id: true, sku: true, nameFr: true, nameEn: true } },
        variant: { select: { id: true, sku: true, nameFr: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async listLowStock(threshold = 10) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        stockQty: { lte: threshold },
      },
      select: {
        id: true,
        sku: true,
        nameFr: true,
        nameEn: true,
        stockQty: true,
      },
      orderBy: { stockQty: 'asc' },
    });
  }

  private withStructuredData(
    product: Prisma.ProductGetPayload<{ include: typeof productInclude }>,
    locale: 'fr' | 'en',
  ) {
    const name = locale === 'en' ? product.nameEn : product.nameFr;
    const description =
      locale === 'en' ? product.descriptionEn : product.descriptionFr;
    const slug = locale === 'en' ? product.slugEn : product.slugFr;
    const primaryImage =
      product.images.find((i) => i.isPrimary) ?? product.images[0];
    const price = product.promoPrice ?? product.price;

    return {
      ...product,
      seo: {
        title:
          (locale === 'en' ? product.seoTitleEn : product.seoTitleFr) ?? name,
        description:
          (locale === 'en'
            ? product.seoDescriptionEn
            : product.seoDescriptionFr) ?? description,
        slug,
        ogImage: product.ogImageUrl ?? primaryImage?.url,
      },
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description,
        sku: product.sku,
        brand: product.brand
          ? { '@type': 'Brand', name: product.brand.name }
          : undefined,
        image: product.images.map((i) => i.url),
        offers: {
          '@type': 'Offer',
          priceCurrency: product.currency,
          price: Number(price),
          availability:
            product.stockQty > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        },
        aggregateRating:
          product.ratingsCount > 0
            ? {
                '@type': 'AggregateRating',
                ratingValue: Number(product.ratingsAvg),
                reviewCount: product.ratingsCount,
              }
            : undefined,
      },
    };
  }

  private mapImages(images: ProductImageInputDto[]) {
    return images.map((img, index) => ({
      url: img.url,
      altFr: img.altFr,
      altEn: img.altEn,
      sortOrder: img.sortOrder ?? index,
      isPrimary: img.isPrimary ?? index === 0,
    }));
  }

  private async ensureProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async ensureBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
  }

  private async ensureProductSlugsFree(
    slugFr?: string,
    slugEn?: string,
    excludeId?: string,
  ) {
    if (slugFr) {
      const exists = await this.prisma.product.findFirst({
        where: { slugFr, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (exists) {
        throw new ConflictException(`slugFr already used: ${slugFr}`);
      }
    }
    if (slugEn) {
      const exists = await this.prisma.product.findFirst({
        where: { slugEn, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (exists) {
        throw new ConflictException(`slugEn already used: ${slugEn}`);
      }
    }
  }

  private skuBase(name: string) {
    const compact = this.slug
      .slugify(name)
      .replace(/-/g, '')
      .toUpperCase()
      .slice(0, 14);
    return compact ? `MD-${compact}` : 'MD-PROD';
  }

  private async resolveSku(requested: string | undefined, name: string) {
    const sku = requested?.trim() || this.skuBase(name);
    const clash = await this.prisma.product.findUnique({ where: { sku } });
    if (!clash) {
      return sku;
    }
    if (requested?.trim()) {
      throw new ConflictException(`SKU already exists: ${sku}`);
    }
    let i = 2;
    let candidate = `${sku}-${i}`;
    while (await this.prisma.product.findUnique({ where: { sku: candidate } })) {
      i += 1;
      candidate = `${sku}-${i}`;
    }
    return candidate;
  }

  private looksAutoGenerated(currentSlug: string, fromName: string) {
    const base = this.slug.slugify(fromName);
    if (!base) return false;
    return currentSlug === base || new RegExp(`^${base}-\\d+$`).test(currentSlug);
  }

  private keywordsFromName(name: string) {
    return [
      ...new Set(
        this.slug
          .slugify(name)
          .split('-')
          .filter((word) => word.length >= 3),
      ),
    ].slice(0, 8);
  }

  private seoSnippet(text?: string | null, fallback?: string) {
    const raw = (text ?? fallback ?? '').replace(/\s+/g, ' ').trim();
    if (!raw) return undefined;
    return raw.length <= 160 ? raw : `${raw.slice(0, 157).trimEnd()}…`;
  }
}
