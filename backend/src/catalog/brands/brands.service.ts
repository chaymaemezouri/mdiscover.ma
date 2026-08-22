import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { SlugService } from '../../common/utils/slug.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slug: SlugService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateBrandDto, adminId: string) {
    const existing = await this.prisma.brand.findMany({
      select: { slugFr: true, slugEn: true },
    });
    const slugFr =
      dto.slugFr ??
      this.slug.unique(
        dto.name,
        existing.map((b) => b.slugFr),
      );
    const slugEn =
      dto.slugEn ??
      this.slug.unique(
        dto.name,
        existing.map((b) => b.slugEn),
      );
    await this.ensureSlugsFree(slugFr, slugEn);

    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name,
        slugFr,
        slugEn,
        descriptionFr: dto.descriptionFr,
        descriptionEn: dto.descriptionEn,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        catalogPdfUrl: dto.catalogPdfUrl,
        seoTitleFr: dto.seoTitleFr ?? dto.name,
        seoTitleEn: dto.seoTitleEn ?? dto.name,
        seoDescriptionFr: dto.seoDescriptionFr,
        seoDescriptionEn: dto.seoDescriptionEn,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'BRAND_CREATED',
      entity: 'Brand',
      entityId: brand.id,
    });

    return brand;
  }

  findAllPublic() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findBySlug(slug: string, locale: 'fr' | 'en' = 'fr') {
    const brand = await this.prisma.brand.findFirst({
      where: {
        isActive: true,
        OR: [{ slugFr: slug }, { slugEn: slug }],
      },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return {
      ...brand,
      seo: {
        title: locale === 'en' ? brand.seoTitleEn : brand.seoTitleFr,
        description:
          locale === 'en' ? brand.seoDescriptionEn : brand.seoDescriptionFr,
        slug: locale === 'en' ? brand.slugEn : brand.slugFr,
      },
    };
  }

  async update(id: string, dto: UpdateBrandDto, adminId: string) {
    await this.ensureBrand(id);
    if (dto.slugFr || dto.slugEn) {
      await this.ensureSlugsFree(dto.slugFr, dto.slugEn, id);
    }
    const brand = await this.prisma.brand.update({
      where: { id },
      data: { ...dto },
    });
    await this.audit.log({
      userId: adminId,
      action: 'BRAND_UPDATED',
      entity: 'Brand',
      entityId: id,
    });
    return brand;
  }

  async remove(id: string, adminId: string) {
    await this.ensureBrand(id);
    const count = await this.prisma.product.count({ where: { brandId: id } });
    if (count > 0) {
      throw new ConflictException(
        'Cannot delete brand with products — deactivate it instead',
      );
    }
    await this.prisma.brand.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: 'BRAND_DELETED',
      entity: 'Brand',
      entityId: id,
    });
    return { success: true };
  }

  private async ensureBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  private async ensureSlugsFree(
    slugFr?: string,
    slugEn?: string,
    excludeId?: string,
  ) {
    if (slugFr) {
      const exists = await this.prisma.brand.findFirst({
        where: { slugFr, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (exists) {
        throw new ConflictException(`slugFr already used: ${slugFr}`);
      }
    }
    if (slugEn) {
      const exists = await this.prisma.brand.findFirst({
        where: { slugEn, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (exists) {
        throw new ConflictException(`slugEn already used: ${slugEn}`);
      }
    }
  }
}
