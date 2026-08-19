import { Injectable, NotFoundException } from '@nestjs/common';
import { BannerPlacement, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/content.dto';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listPublic(placement?: BannerPlacement) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        ...(placement ? { placement } : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  listAdmin() {
    return this.prisma.banner.findMany({
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(adminId: string, dto: CreateBannerDto) {
    const banner = await this.prisma.banner.create({
      data: {
        placement: dto.placement,
        imageUrl: dto.imageUrl,
        titleFr: dto.titleFr,
        titleEn: dto.titleEn,
        subtitleFr: dto.subtitleFr,
        subtitleEn: dto.subtitleEn,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'BANNER_CREATED',
      entity: 'Banner',
      entityId: banner.id,
    });
    return banner;
  }

  async update(id: string, adminId: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Banner not found');

    const data: Prisma.BannerUpdateInput = {
      placement: dto.placement,
      imageUrl: dto.imageUrl,
      titleFr: dto.titleFr,
      titleEn: dto.titleEn,
      subtitleFr: dto.subtitleFr,
      subtitleEn: dto.subtitleEn,
      linkUrl: dto.linkUrl,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    };
    if (dto.startsAt !== undefined) {
      data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }

    const banner = await this.prisma.banner.update({ where: { id }, data });
    await this.audit.log({
      userId: adminId,
      action: 'BANNER_UPDATED',
      entity: 'Banner',
      entityId: id,
    });
    return banner;
  }

  async remove(id: string, adminId: string) {
    await this.prisma.banner.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: 'BANNER_DELETED',
      entity: 'Banner',
      entityId: id,
    });
    return { deleted: true };
  }
}
