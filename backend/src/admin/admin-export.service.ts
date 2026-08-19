import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toCsv } from './csv.util';

@Injectable()
export class AdminExportService {
  constructor(private readonly prisma: PrismaService) {}

  async ordersCsv(from?: string, to?: string) {
    const where = this.dateWhere(from, to);
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    return toCsv(
      [
        'number',
        'status',
        'email',
        'total',
        'currency',
        'paymentMethod',
        'deliveryMode',
        'createdAt',
      ],
      orders.map((o) => [
        o.number,
        o.status,
        o.user.email,
        Number(o.total),
        o.currency,
        o.paymentMethod,
        o.deliveryMode,
        o.createdAt.toISOString(),
      ]),
    );
  }

  async productsCsv() {
    const products = await this.prisma.product.findMany({
      include: {
        category: { select: { slugFr: true } },
        brand: { select: { slugFr: true } },
      },
      orderBy: { sku: 'asc' },
    });

    return toCsv(
      [
        'sku',
        'nameFr',
        'nameEn',
        'price',
        'promoPrice',
        'stockQty',
        'purchaseMode',
        'categorySlugFr',
        'brandSlugFr',
        'isActive',
        'originCountry',
        'packaging',
      ],
      products.map((p) => [
        p.sku,
        p.nameFr,
        p.nameEn,
        Number(p.price),
        p.promoPrice != null ? Number(p.promoPrice) : '',
        p.stockQty,
        p.purchaseMode,
        p.category.slugFr,
        p.brand?.slugFr ?? '',
        p.isActive,
        p.originCountry ?? '',
        p.packaging ?? '',
      ]),
    );
  }

  async customersCsv() {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['CUSTOMER_INDIVIDUAL', 'CUSTOMER_PRO'] },
      },
      include: {
        individualProfile: true,
        professionalProfile: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    return toCsv(
      [
        'email',
        'role',
        'status',
        'firstName',
        'lastName',
        'companyName',
        'ordersCount',
        'createdAt',
      ],
      users.map((u) => [
        u.email,
        u.role,
        u.status,
        u.individualProfile?.firstName ?? '',
        u.individualProfile?.lastName ?? '',
        u.professionalProfile?.companyName ?? '',
        u._count.orders,
        u.createdAt.toISOString(),
      ]),
    );
  }

  async salesReportCsv(from?: string, to?: string) {
    const where = this.dateWhere(from, to);
    const orders = await this.prisma.order.findMany({
      where: {
        ...where,
        status: {
          notIn: [OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT],
        },
      },
      select: {
        number: true,
        status: true,
        subtotal: true,
        discount: true,
        taxAmount: true,
        shippingFee: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 5000,
    });

    return toCsv(
      [
        'number',
        'status',
        'subtotal',
        'discount',
        'taxAmount',
        'shippingFee',
        'total',
        'createdAt',
      ],
      orders.map((o) => [
        o.number,
        o.status,
        Number(o.subtotal),
        Number(o.discount),
        Number(o.taxAmount),
        Number(o.shippingFee),
        Number(o.total),
        o.createdAt.toISOString(),
      ]),
    );
  }

  private dateWhere(from?: string, to?: string) {
    if (!from && !to) return undefined;
    return {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }
}
