import { Injectable, NotFoundException } from '@nestjs/common';
import { LegalPageType, Locale } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SlugService } from '../common/utils/slug.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertLegalPageDto } from './dto/content.dto';

@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slug: SlugService,
    private readonly audit: AuditService,
  ) {}

  listPublic(locale?: Locale) {
    return this.prisma.legalPage.findMany({
      where: {
        isPublished: true,
        ...(locale ? { locale } : {}),
      },
      select: {
        id: true,
        type: true,
        locale: true,
        slug: true,
        title: true,
        updatedAt: true,
      },
      orderBy: [{ locale: 'asc' }, { type: 'asc' }],
    });
  }

  async getByType(type: LegalPageType, locale: Locale = Locale.FR) {
    const page = await this.prisma.legalPage.findUnique({
      where: { type_locale: { type, locale } },
    });
    if (!page || !page.isPublished) {
      throw new NotFoundException('Legal page not found');
    }
    return page;
  }

  async getBySlug(slug: string, locale: Locale = Locale.FR) {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug_locale: { slug, locale } },
    });
    if (!page || !page.isPublished) {
      throw new NotFoundException('Legal page not found');
    }
    return page;
  }

  listAdmin() {
    return this.prisma.legalPage.findMany({
      orderBy: [{ type: 'asc' }, { locale: 'asc' }],
    });
  }

  async upsert(adminId: string, dto: UpsertLegalPageDto) {
    const slug =
      dto.slug ??
      this.slug.slugify(`${dto.type.toLowerCase()}-${dto.locale.toLowerCase()}`);

    const page = await this.prisma.legalPage.upsert({
      where: { type_locale: { type: dto.type, locale: dto.locale } },
      create: {
        type: dto.type,
        locale: dto.locale,
        slug,
        title: dto.title,
        content: dto.content,
        isPublished: dto.isPublished ?? true,
        updatedById: adminId,
      },
      update: {
        slug: dto.slug ?? undefined,
        title: dto.title,
        content: dto.content,
        isPublished: dto.isPublished,
        updatedById: adminId,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'LEGAL_PAGE_UPSERTED',
      entity: 'LegalPage',
      entityId: page.id,
      metadata: { type: dto.type, locale: dto.locale },
    });

    return page;
  }
}
