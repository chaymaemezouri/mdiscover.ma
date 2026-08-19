import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(from?: string, to?: string) {
    const range = this.resolveRange(from, to);
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

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        status: { in: paidLike },
      },
      select: { createdAt: true, total: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay = new Map<string, { count: number; revenue: number }>();
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      const prev = byDay.get(day) ?? { count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += Number(order.total);
      byDay.set(day, prev);
    }

    const series = [...byDay.entries()].map(([date, v]) => ({
      date,
      orders: v.count,
      revenue: Number(v.revenue.toFixed(2)),
    }));

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      totals: {
        orders: orders.length,
        revenue: Number(
          orders.reduce((s, o) => s + Number(o.total), 0).toFixed(2),
        ),
      },
      series,
    };
  }

  async topProducts(from?: string, to?: string, take = 10) {
    const range = this.resolveRange(from, to);
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: range.from, lte: range.to },
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT],
          },
        },
      },
      select: {
        productId: true,
        quantity: true,
        lineTotal: true,
        nameFr: true,
        sku: true,
      },
    });

    const map = new Map<
      string,
      { productId: string; sku: string; nameFr: string; qty: number; revenue: number }
    >();
    for (const item of items) {
      const prev = map.get(item.productId) ?? {
        productId: item.productId,
        sku: item.sku,
        nameFr: item.nameFr,
        qty: 0,
        revenue: 0,
      };
      prev.qty += item.quantity;
      prev.revenue += Number(item.lineTotal);
      map.set(item.productId, prev);
    }

    return [...map.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, take)
      .map((r) => ({ ...r, revenue: Number(r.revenue.toFixed(2)) }));
  }

  private resolveRange(from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from
      ? new Date(from)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: start, to: end };
  }
}
