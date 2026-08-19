import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderDocumentType,
  OrderStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelOrderDto,
  GenerateDocumentDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { OrderPdfService } from './order-pdf.service';

const orderInclude = {
  items: true,
  history: { orderBy: { createdAt: 'asc' as const } },
  documents: { orderBy: { createdAt: 'desc' as const } },
  quote: { select: { id: true, number: true, status: true } },
  shipments: {
    include: { carrier: true },
    orderBy: { createdAt: 'desc' as const },
  },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    take: 8,
  },
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      individualProfile: true,
      professionalProfile: true,
    },
  },
} as const;

/** Transitions autorisées (CDC) */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  CONFIRMED: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  PREPARING: [OrderStatus.READY_TO_SHIP, OrderStatus.CANCELLED],
  READY_TO_SHIP: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  DELIVERED: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
  CANCELLED: [],
  RETURNED: [OrderStatus.REFUNDED],
  REFUNDED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: OrderPdfService,
    private readonly audit: AuditService,
  ) {}

  async listMine(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.serialize(o));
  }

  async listAdmin(status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return orders.map((o) => this.serialize(o));
  }

  async getOne(id: string, userId: string, role: Role) {
    const order = await this.findOrThrow(id);
    this.assertAccess(order.userId, userId, role);
    return this.serialize(order);
  }

  async getByNumber(number: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { number },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.assertAccess(order.userId, userId, role);
    return this.serialize(order);
  }

  async markAsPaid(orderId: string, actorId: string | null, note?: string) {
    return this.updateStatus(
      orderId,
      { status: OrderStatus.PAID, note: note ?? 'Payment confirmed' },
      actorId,
    );
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    adminId: string | null,
  ) {
    const order = await this.findOrThrow(id);
    this.assertTransition(order.status, dto.status);

    if (dto.status === OrderStatus.CANCELLED && !dto.cancelReason && !order.cancelReason) {
      throw new BadRequestException('cancelReason is required to cancel');
    }

    const data: Prisma.OrderUpdateInput = {
      status: dto.status,
      adminNote: dto.note ?? order.adminNote,
      carrierName: dto.carrierName ?? order.carrierName,
      trackingNumber: dto.trackingNumber ?? order.trackingNumber,
    };

    if (dto.status === OrderStatus.SHIPPED) {
      data.shippedAt = new Date();
    }
    if (dto.status === OrderStatus.DELIVERED) {
      data.deliveredAt = new Date();
    }
    if (dto.status === OrderStatus.CANCELLED) {
      data.cancelledAt = new Date();
      data.cancelReason = dto.cancelReason;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id },
        data,
        include: orderInclude,
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: dto.status,
          note: dto.note ?? dto.cancelReason,
          changedBy: adminId ?? 'system',
        },
      });

      // Restore stock on cancel before shipping
      const restorable: OrderStatus[] = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY_TO_SHIP,
      ];
      if (dto.status === OrderStatus.CANCELLED && restorable.includes(order.status)) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQty: { increment: item.quantity },
              salesCount: { decrement: item.quantity },
            },
          });
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQty: { increment: item.quantity } },
            });
          }
        }
      }

      return next;
    });

    await this.audit.log({
      userId: adminId,
      action: 'ORDER_STATUS_UPDATED',
      entity: 'Order',
      entityId: id,
      metadata: { from: order.status, to: dto.status },
    });

    // Auto-generate useful docs
    if (dto.status === OrderStatus.PAID) {
      await this.generateDocument(
        id,
        { type: OrderDocumentType.INVOICE, locale: 'FR' },
        adminId,
        true,
      );
      await this.generateDocument(
        id,
        { type: OrderDocumentType.RECEIPT, locale: 'FR' },
        adminId,
        true,
      );
    }
    if (dto.status === OrderStatus.SHIPPED) {
      await this.generateDocument(
        id,
        { type: OrderDocumentType.DELIVERY_NOTE, locale: 'FR' },
        adminId,
        true,
      );
    }

    return this.serialize(await this.findOrThrow(id));
  }

  async updateNote(id: string, note: string, adminId: string) {
    await this.findOrThrow(id);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { adminNote: note.trim() || null },
      include: orderInclude,
    });
    await this.audit.log({
      userId: adminId,
      action: 'ORDER_NOTE_UPDATED',
      entity: 'Order',
      entityId: id,
    });
    return this.serialize(updated);
  }

  async cancelByCustomer(id: string, userId: string, dto: CancelOrderDto) {
    const order = await this.findOrThrow(id);
    this.assertOwner(order.userId, userId);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Only pending payment orders can be cancelled by the customer',
      );
    }
    return this.updateStatus(
      id,
      {
        status: OrderStatus.CANCELLED,
        cancelReason: dto.reason ?? 'Cancelled by customer',
        note: dto.reason,
      },
      userId,
    );
  }

  async generateDocument(
    id: string,
    dto: GenerateDocumentDto,
    actorId: string | null,
    silent = false,
  ) {
    const order = await this.findOrThrow(id);
    const locale = dto.locale ?? 'FR';
    const fileUrl = await this.pdf.generate(
      {
        number: order.number,
        status: order.status,
        createdAt: order.createdAt,
        currency: order.currency,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        taxRate: Number(order.taxRate),
        taxAmount: Number(order.taxAmount),
        shippingFee: Number(order.shippingFee),
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        deliveryMode: order.deliveryMode,
        carrierName: order.carrierName,
        trackingNumber: order.trackingNumber,
        shippingAddress: order.shippingAddressSnap as Record<string, unknown>,
        items: order.items.map((i) => ({
          sku: i.sku,
          nameFr: i.nameFr,
          nameEn: i.nameEn,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
        })),
      },
      dto.type,
      locale,
    );

    const document = await this.prisma.orderDocument.create({
      data: {
        orderId: id,
        type: dto.type,
        fileUrl,
        locale: locale === 'EN' ? 'EN' : 'FR',
      },
    });

    if (!silent) {
      await this.audit.log({
        userId: actorId,
        action: 'ORDER_DOCUMENT_GENERATED',
        entity: 'OrderDocument',
        entityId: document.id,
        metadata: { orderId: id, type: dto.type },
      });
    }

    return document;
  }

  async listDocuments(id: string, userId: string, role: Role) {
    const order = await this.findOrThrow(id);
    this.assertAccess(order.userId, userId, role);
    return order.documents;
  }

  private assertTransition(from: OrderStatus, to: OrderStatus) {
    const allowed = ALLOWED[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition: ${from} → ${to}`,
      );
    }
  }

  private async findOrThrow(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private assertOwner(ownerId: string, userId: string) {
    if (ownerId !== userId) {
      throw new ForbiddenException('Not your order');
    }
  }

  private assertAccess(ownerId: string, userId: string, role: Role) {
    if (ownerId === userId || role === Role.ADMIN || role === Role.DEVELOPER) {
      return;
    }
    throw new ForbiddenException('Not your order');
  }

  private serialize(
    order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  ) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      taxRate: Number(order.taxRate),
      taxAmount: Number(order.taxAmount),
      shippingFee: Number(order.shippingFee),
      total: Number(order.total),
      items: order.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
        weightKg: i.weightKg != null ? Number(i.weightKg) : null,
      })),
      payments: order.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
      allowedNextStatuses: ALLOWED[order.status] ?? [],
    };
  }
}
