import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { SlugService } from '../../common/utils/slug.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slug: SlugService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateCategoryDto, adminId: string) {
    if (dto.parentId) {
      await this.ensureCategory(dto.parentId);
    }

    const nameEn = dto.nameEn?.trim() || dto.nameFr;
    const descriptionEn = dto.descriptionEn ?? dto.descriptionFr;
    const existingFr = await this.prisma.category.findMany({
      select: { slugFr: true, slugEn: true },
    });
    const slugFr =
      dto.slugFr ??
      this.slug.unique(
        dto.nameFr,
        existingFr.map((c) => c.slugFr),
      );
    const slugEn =
      dto.slugEn ??
      this.slug.unique(
        nameEn,
        existingFr.map((c) => c.slugEn),
      );

    await this.ensureSlugsFree(slugFr, slugEn);

    const category = await this.prisma.category.create({
      data: {
        parentId: dto.parentId,
        nameFr: dto.nameFr,
        nameEn,
        slugFr,
        slugEn,
        descriptionFr: dto.descriptionFr,
        descriptionEn,
        imageUrl: dto.imageUrl,
        imageAltFr: dto.imageAltFr,
        imageAltEn: dto.imageAltEn,
        seoTitleFr: dto.seoTitleFr ?? dto.nameFr,
        seoTitleEn: dto.seoTitleEn ?? nameEn,
        seoDescriptionFr:
          dto.seoDescriptionFr ??
          this.seoSnippet(dto.descriptionFr, dto.nameFr),
        seoDescriptionEn:
          dto.seoDescriptionEn ?? this.seoSnippet(descriptionEn, nameEn),
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { children: true },
    });

    await this.audit.log({
      userId: adminId,
      action: 'CATEGORY_CREATED',
      entity: 'Category',
      entityId: category.id,
    });

    return category;
  }

  async findAllPublic() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.category.findMany({
      include: {
        children: { select: { id: true, nameFr: true, isActive: true } },
        parent: { select: { id: true, nameFr: true } },
        _count: { select: { products: true, children: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { nameFr: 'asc' }],
    });
  }

  async findOneAdmin(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          select: { id: true, nameFr: true, slugFr: true, isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { nameFr: 'asc' }],
        },
        parent: { select: { id: true, nameFr: true } },
        products: {
          select: {
            id: true,
            sku: true,
            nameFr: true,
            isActive: true,
            stockQty: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        },
        _count: { select: { products: true, children: true } },
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findBySlug(slug: string, locale: 'fr' | 'en' = 'fr') {
    const category = await this.prisma.category.findFirst({
      where: {
        isActive: true,
        OR: [{ slugFr: slug }, { slugEn: slug }],
      },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        parent: true,
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return {
      ...category,
      seo: {
        title: locale === 'en' ? category.seoTitleEn : category.seoTitleFr,
        description:
          locale === 'en'
            ? category.seoDescriptionEn
            : category.seoDescriptionFr,
        slug: locale === 'en' ? category.slugEn : category.slugFr,
      },
    };
  }

  async update(id: string, dto: UpdateCategoryDto, adminId: string) {
    const current = await this.ensureCategory(id);
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }
      await this.ensureCategory(dto.parentId);
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
      const slugs = await this.prisma.category.findMany({
        where: { NOT: { id } },
        select: { slugFr: true, slugEn: true },
      });
      slugFr = this.slug.unique(
        nameFr,
        slugs.map((c) => c.slugFr),
      );
      if (!slugEn && this.looksAutoGenerated(current.slugEn, current.nameEn)) {
        slugEn = this.slug.unique(
          nameEn,
          slugs.map((c) => c.slugEn),
        );
      }
    }
    if (slugFr || slugEn) {
      await this.ensureSlugsFree(slugFr, slugEn, id);
    }

    const data: Prisma.CategoryUpdateInput = {
      nameFr: dto.nameFr,
      nameEn: dto.nameEn ?? (dto.nameFr ? nameEn : undefined),
      slugFr,
      slugEn,
      descriptionFr: dto.descriptionFr,
      descriptionEn:
        dto.descriptionEn ??
        (dto.descriptionFr !== undefined ? descriptionEn : undefined),
      imageUrl: dto.imageUrl,
      imageAltFr: dto.imageAltFr,
      imageAltEn: dto.imageAltEn,
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
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    };

    if (dto.parentId === null) {
      data.parent = { disconnect: true };
    } else if (dto.parentId) {
      data.parent = { connect: { id: dto.parentId } };
    }

    await this.prisma.category.update({
      where: { id },
      data,
    });

    await this.audit.log({
      userId: adminId,
      action: 'CATEGORY_UPDATED',
      entity: 'Category',
      entityId: id,
    });

    return this.findOneAdmin(id);
  }

  async remove(id: string, adminId: string) {
    await this.ensureCategory(id);
    const childrenCount = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (childrenCount > 0) {
      throw new ConflictException(
        'Cannot delete category with subcategories — deactivate it instead',
      );
    }
    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productsCount > 0) {
      throw new ConflictException(
        'Cannot delete category with products — deactivate it instead',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: 'CATEGORY_DELETED',
      entity: 'Category',
      entityId: id,
    });
    return { success: true };
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private looksAutoGenerated(currentSlug: string, fromName: string) {
    const base = this.slug.slugify(fromName);
    if (!base) return false;
    return currentSlug === base || new RegExp(`^${base}-\\d+$`).test(currentSlug);
  }

  private seoSnippet(text?: string | null, fallback?: string) {
    const raw = (text ?? fallback ?? '').replace(/\s+/g, ' ').trim();
    if (!raw) return undefined;
    return raw.length <= 160 ? raw : `${raw.slice(0, 157).trimEnd()}…`;
  }

  private async ensureSlugsFree(
    slugFr?: string,
    slugEn?: string,
    excludeId?: string,
  ) {
    if (slugFr) {
      const exists = await this.prisma.category.findFirst({
        where: {
          slugFr,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (exists) {
        throw new ConflictException(`slugFr already used: ${slugFr}`);
      }
    }
    if (slugEn) {
      const exists = await this.prisma.category.findFirst({
        where: {
          slugEn,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (exists) {
        throw new ConflictException(`slugEn already used: ${slugEn}`);
      }
    }
  }
}
