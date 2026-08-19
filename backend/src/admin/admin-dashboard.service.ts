import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  ProValidationStatus,
  QuoteStatus,
  ReturnStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidLike: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY_TO_SHIP,
      OrderStatus.SHIPPED,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.RETURNED,
      OrderStatus.REFUNDED,
    ];

    const [
      ordersToday,
      ordersMonth,
      revenueAgg,
      ordersByStatus,
      customersTotal,
      customersProPending,
      productsActive,
      lowStock,
      pendingQuotes,
      pendingReturns,
      pendingReviews,
      awaitingPayments,
      openShipments,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: paidLike },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: {
          role: {
            in: [Role.CUSTOMER_INDIVIDUAL, Role.CUSTOMER_PRO],
          },
        },
      }),
      this.prisma.professionalProfile.count({
        where: { validationStatus: ProValidationStatus.PENDING },
      }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.lowStockCount(),
      this.prisma.quote.count({
        where: {
          status: {
            in: [QuoteStatus.REQUESTED, QuoteStatus.IN_REVIEW],
          },
        },
      }),
      this.prisma.returnRequest.count({
        where: {
          status: {
            in: [
              ReturnStatus.REQUESTED,
              ReturnStatus.UNDER_REVIEW,
              ReturnStatus.APPROVED,
              ReturnStatus.AWAITING_RETURN_SHIPMENT,
              ReturnStatus.RECEIVED,
            ],
          },
        },
      }),
      this.prisma.review.count({ where: { isApproved: false } }),
      this.prisma.payment.count({
        where: {
          status: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.AWAITING_PROOF,
              PaymentStatus.PROOF_SUBMITTED,
              PaymentStatus.PROCESSING,
            ],
          },
        },
      }),
      this.prisma.shipment.count({
        where: {
          status: {
            in: ['PENDING', 'LABEL_CREATED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
          },
        },
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      kpis: {
        ordersToday,
        ordersMonth,
        revenueMonth: Number(revenueAgg._sum.total ?? 0),
        paidOrdersMonth: revenueAgg._count,
        customersTotal,
        productsActive,
        lowStock,
      },
      queues: {
        customersProPending,
        pendingQuotes,
        pendingReturns,
        pendingReviews,
        awaitingPayments,
        openShipments,
      },
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((row) => [row.status, row._count._all]),
      ),
    };
  }

  async getOverview() {
    const dash = await this.getDashboard();
    return {
      ...dash,
      modules: [
        { key: 'catalog', paths: ['/admin/products', '/admin/categories', '/admin/brands'] },
        { key: 'orders', paths: ['/admin/orders'] },
        { key: 'quotes', paths: ['/admin/quotes'] },
        { key: 'payments', paths: ['/payments/admin'] },
        { key: 'shipping', paths: ['/shipping/admin/zones', '/shipping/admin/shipments'] },
        { key: 'returns', paths: ['/returns/admin'] },
        { key: 'content', paths: ['/blog/admin', '/faq/admin', '/legal/admin', '/banners/admin'] },
        { key: 'customers', paths: ['/admin/users'] },
        { key: 'reports', paths: ['/admin/export/orders', '/admin/export/products', '/admin/stats/sales'] },
      ],
    };
  }

  private async lowStockCount() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'ops.lowStockThreshold' },
    });
    const parsed = Number(setting?.value);
    const threshold = Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
    return this.prisma.product.count({
      where: { isActive: true, stockQty: { lte: threshold } },
    });
  }
}
