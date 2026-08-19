import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockAlertDto } from './dto/content.dto';

@Injectable()
export class StockAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async subscribe(userId: string, email: string | null, dto: CreateStockAlertDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.stockQty > 0) {
      throw new BadRequestException('Product is currently in stock');
    }

    const alert = await this.prisma.stockAlert.upsert({
      where: {
        userId_productId: { userId, productId: dto.productId },
      },
      create: {
        userId,
        productId: dto.productId,
        email: dto.email ?? email ?? undefined,
      },
      update: {
        email: dto.email ?? email ?? undefined,
        notifiedAt: null,
      },
      include: {
        product: { select: { id: true, sku: true, nameFr: true, stockQty: true } },
      },
    });

    await this.audit.log({
      userId,
      action: 'STOCK_ALERT_SUBSCRIBED',
      entity: 'StockAlert',
      entityId: alert.id,
    });

    return alert;
  }

  listMine(userId: string) {
    return this.prisma.stockAlert.findMany({
      where: { userId },
      include: {
        product: {
          select: { id: true, sku: true, nameFr: true, nameEn: true, stockQty: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unsubscribe(userId: string, productId: string) {
    await this.prisma.stockAlert.deleteMany({ where: { userId, productId } });
    return { removed: true };
  }

  async markNotified(productId: string, adminId: string) {
    const result = await this.prisma.stockAlert.updateMany({
      where: { productId, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    await this.audit.log({
      userId: adminId,
      action: 'STOCK_ALERTS_NOTIFIED',
      entity: 'Product',
      entityId: productId,
      metadata: { count: result.count },
    });
    return { notified: result.count };
  }

  listPendingAdmin(productId?: string) {
    return this.prisma.stockAlert.findMany({
      where: {
        notifiedAt: null,
        ...(productId ? { productId } : {}),
      },
      include: {
        user: { select: { id: true, email: true } },
        product: { select: { id: true, sku: true, nameFr: true, stockQty: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
  }
}
