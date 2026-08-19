import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto, UpdateFaqDto } from './dto/content.dto';

@Injectable()
export class FaqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listPublic(locale?: Locale, category?: string) {
    return this.prisma.faqItem.findMany({
      where: {
        isActive: true,
        ...(locale ? { locale } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  listAdmin() {
    return this.prisma.faqItem.findMany({
      orderBy: [{ locale: 'asc' }, { category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(adminId: string, dto: CreateFaqDto) {
    const item = await this.prisma.faqItem.create({
      data: {
        category: dto.category,
        question: dto.question,
        answer: dto.answer,
        locale: dto.locale ?? Locale.FR,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'FAQ_CREATED',
      entity: 'FaqItem',
      entityId: item.id,
    });
    return item;
  }

  async update(id: string, adminId: string, dto: UpdateFaqDto) {
    const existing = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('FAQ item not found');
    const item = await this.prisma.faqItem.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      userId: adminId,
      action: 'FAQ_UPDATED',
      entity: 'FaqItem',
      entityId: id,
    });
    return item;
  }

  async remove(id: string, adminId: string) {
    await this.prisma.faqItem.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: 'FAQ_DELETED',
      entity: 'FaqItem',
      entityId: id,
    });
    return { deleted: true };
  }
}
