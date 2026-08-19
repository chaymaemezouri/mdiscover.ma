import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderDocumentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  RefundType,
  ReturnStatus,
  Role,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { OrderPdfService } from '../orders/order-pdf.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddReturnPhotosDto,
  CreateRefundDto,
  CreateReturnDto,
  ReceiveReturnDto,
  ReviewReturnDto,
  UpdateReturnTrackingDto,
} from './dto/returns.dto';

const returnInclude = {
  items: { include: { orderItem: true } },
  photos: true,
  refunds: true,
  order: {
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      currency: true,
      deliveredAt: true,
      paymentMethod: true,
    },
  },
  user: { select: { id: true, email: true, role: true } },
} as const;

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
    private readonly pdf: OrderPdfService,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, dto: CreateReturnDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true, returns: { include: { items: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Returns are only allowed on delivered orders',
      );
    }

    const windowDays = Number(
      this.config.get<string>('RETURN_WINDOW_DAYS') ?? 14,
    );
    if (order.deliveredAt) {
      const deadline = new Date(order.deliveredAt);
      deadline.setDate(deadline.getDate() + windowDays);
      if (new Date() > deadline) {
        throw new BadRequestException(
          `Return window of ${windowDays} days has expired`,
        );
      }
    }

    const openStatuses: ReturnStatus[] = [
      ReturnStatus.REQUESTED,
      ReturnStatus.UNDER_REVIEW,
      ReturnStatus.APPROVED,
      ReturnStatus.AWAITING_RETURN_SHIPMENT,
      ReturnStatus.RECEIVED,
    ];
    const hasOpen = order.returns.some((r) => openStatuses.includes(r.status));
    if (hasOpen) {
      throw new BadRequestException(
        'An open return already exists for this order',
      );
    }

    const itemById = new Map(order.items.map((i) => [i.id, i]));
    const alreadyReturned = new Map<string, number>();
    for (const ret of order.returns) {
      if (ret.status === ReturnStatus.REJECTED || ret.status === ReturnStatus.CANCELLED) {
        continue;
      }
      for (const ri of ret.items) {
        alreadyReturned.set(
          ri.orderItemId,
          (alreadyReturned.get(ri.orderItemId) ?? 0) + ri.quantity,
        );
      }
    }

    for (const line of dto.items) {
      const oi = itemById.get(line.orderItemId);
      if (!oi || oi.orderId !== order.id) {
        throw new BadRequestException(
          `Order item ${line.orderItemId} not found on this order`,
        );
      }
      const used = alreadyReturned.get(line.orderItemId) ?? 0;
      if (line.quantity + used > oi.quantity) {
        throw new BadRequestException(
          `Quantity exceeds available returnable qty for item ${oi.sku}`,
        );
      }
    }

    const number = await this.nextReturnNumber();
    const created = await this.prisma.returnRequest.create({
      data: {
        number,
        orderId: order.id,
        userId,
        reason: dto.reason,
        comment: dto.comment,
        items: {
          create: dto.items.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: i.quantity,
            reason: i.reason ?? dto.reason,
            note: i.note,
          })),
        },
        photos: dto.photoUrls?.length
          ? { create: dto.photoUrls.map((fileUrl) => ({ fileUrl })) }
          : undefined,
      },
      include: returnInclude,
    });

    await this.audit.log({
      userId,
      action: 'RETURN_REQUESTED',
      entity: 'ReturnRequest',
      entityId: created.id,
      metadata: { orderId: order.id, number },
    });

    return this.serialize(created);
  }

  async listMine(userId: string) {
    const rows = await this.prisma.returnRequest.findMany({
      where: { userId },
      include: returnInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async listAdmin(status?: ReturnStatus) {
    const rows = await this.prisma.returnRequest.findMany({
      where: status ? { status } : undefined,
      include: returnInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.serialize(r));
  }

  async getOne(id: string, userId: string, role: Role) {
    const row = await this.findOrThrow(id);
    this.assertAccess(row.userId, userId, role);
    return this.serialize(row);
  }

  async cancel(id: string, userId: string) {
    const row = await this.findOrThrow(id);
    if (row.userId !== userId) throw new ForbiddenException('Not your return');
    if (row.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestException('Only REQUESTED returns can be cancelled');
    }
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.CANCELLED },
      include: returnInclude,
    });
    await this.audit.log({
      userId,
      action: 'RETURN_CANCELLED',
      entity: 'ReturnRequest',
      entityId: id,
    });
    return this.serialize(updated);
  }

  async addPhotos(id: string, userId: string, dto: AddReturnPhotosDto) {
    const row = await this.findOrThrow(id);
    if (row.userId !== userId) throw new ForbiddenException('Not your return');
    const editable: ReturnStatus[] = [
      ReturnStatus.REQUESTED,
      ReturnStatus.UNDER_REVIEW,
      ReturnStatus.APPROVED,
      ReturnStatus.AWAITING_RETURN_SHIPMENT,
    ];
    if (!editable.includes(row.status)) {
      throw new BadRequestException('Cannot add photos in current status');
    }
    await this.prisma.returnPhoto.createMany({
      data: dto.photoUrls.map((fileUrl) => ({ returnId: id, fileUrl })),
    });
    return this.getOne(id, userId, Role.CUSTOMER_INDIVIDUAL);
  }

  async updateTracking(
    id: string,
    userId: string,
    dto: UpdateReturnTrackingDto,
  ) {
    const row = await this.findOrThrow(id);
    if (row.userId !== userId) throw new ForbiddenException('Not your return');
    const ok: ReturnStatus[] = [
      ReturnStatus.APPROVED,
      ReturnStatus.AWAITING_RETURN_SHIPMENT,
    ];
    if (!ok.includes(row.status)) {
      throw new BadRequestException(
        'Tracking can only be set after approval',
      );
    }
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: {
        returnCarrierName: dto.returnCarrierName,
        returnTrackingNumber: dto.returnTrackingNumber,
        status: ReturnStatus.AWAITING_RETURN_SHIPMENT,
      },
      include: returnInclude,
    });
    await this.audit.log({
      userId,
      action: 'RETURN_TRACKING_UPDATED',
      entity: 'ReturnRequest',
      entityId: id,
    });
    return this.serialize(updated);
  }

  async review(id: string, adminId: string, dto: ReviewReturnDto) {
    const row = await this.findOrThrow(id);
    const allowedFrom: ReturnStatus[] = [
      ReturnStatus.REQUESTED,
      ReturnStatus.UNDER_REVIEW,
    ];
    if (!allowedFrom.includes(row.status)) {
      throw new BadRequestException('Return cannot be reviewed in this status');
    }

    const allowedTargets: ReturnStatus[] = [
      ReturnStatus.UNDER_REVIEW,
      ReturnStatus.APPROVED,
      ReturnStatus.REJECTED,
      ReturnStatus.AWAITING_RETURN_SHIPMENT,
    ];
    if (!allowedTargets.includes(dto.status)) {
      throw new BadRequestException(
        'Review status must be UNDER_REVIEW, APPROVED, REJECTED or AWAITING_RETURN_SHIPMENT',
      );
    }
    if (dto.status === ReturnStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('rejectionReason is required');
    }

    await this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote ?? row.adminNote,
        rejectionReason: dto.rejectionReason,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    });

    if (
      dto.status === ReturnStatus.APPROVED ||
      dto.status === ReturnStatus.AWAITING_RETURN_SHIPMENT
    ) {
      const order = await this.prisma.order.findUnique({
        where: { id: row.orderId },
      });
      if (order?.status === OrderStatus.DELIVERED) {
        await this.orders.updateStatus(
          row.orderId,
          {
            status: OrderStatus.RETURNED,
            note: `Return ${row.number} approved`,
          },
          adminId,
        );
      }
    }

    await this.audit.log({
      userId: adminId,
      action: 'RETURN_REVIEWED',
      entity: 'ReturnRequest',
      entityId: id,
      metadata: { status: dto.status },
    });

    return this.serialize(
      (await this.prisma.returnRequest.findUnique({
        where: { id },
        include: returnInclude,
      }))!,
    );
  }

  async receive(id: string, adminId: string, dto: ReceiveReturnDto) {
    const row = await this.findOrThrow(id);
    const ok: ReturnStatus[] = [
      ReturnStatus.APPROVED,
      ReturnStatus.AWAITING_RETURN_SHIPMENT,
    ];
    if (!ok.includes(row.status)) {
      throw new BadRequestException('Return is not awaiting reception');
    }

    if (dto.restock) {
      for (const item of row.items) {
        const oi = item.orderItem;
        if (oi.variantId) {
          await this.prisma.productVariant.update({
            where: { id: oi.variantId },
            data: { stockQty: { increment: item.quantity } },
          });
        } else {
          await this.prisma.product.update({
            where: { id: oi.productId },
            data: { stockQty: { increment: item.quantity } },
          });
        }
      }
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: ReturnStatus.RECEIVED,
        receivedAt: new Date(),
        adminNote: dto.adminNote ?? row.adminNote,
      },
      include: returnInclude,
    });

    await this.audit.log({
      userId: adminId,
      action: 'RETURN_RECEIVED',
      entity: 'ReturnRequest',
      entityId: id,
      metadata: { restock: dto.restock ?? false },
    });

    return this.serialize(updated);
  }

  async createRefund(returnId: string, adminId: string, dto: CreateRefundDto) {
    const row = await this.findOrThrow(returnId);
    const ok: ReturnStatus[] = [
      ReturnStatus.APPROVED,
      ReturnStatus.AWAITING_RETURN_SHIPMENT,
      ReturnStatus.RECEIVED,
    ];
    if (!ok.includes(row.status)) {
      throw new BadRequestException(
        'Refund requires an approved/received return',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: row.orderId },
      include: {
        items: true,
        payments: true,
        documents: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const orderTotal = Number(order.total);
    if (dto.amount > orderTotal + 0.001) {
      throw new BadRequestException('Refund amount exceeds order total');
    }
    if (dto.type === RefundType.FULL && Math.abs(dto.amount - orderTotal) > 0.01) {
      throw new BadRequestException(
        'FULL refund amount must equal order total',
      );
    }

    let paymentId = dto.paymentId ?? null;
    if (!paymentId) {
      const succeeded = order.payments.find(
        (p) => p.status === PaymentStatus.SUCCEEDED,
      );
      paymentId = succeeded?.id ?? null;
    } else {
      const payment = order.payments.find((p) => p.id === paymentId);
      if (!payment) throw new NotFoundException('Payment not found on order');
    }

    const number = await this.nextRefundNumber();
    let creditNoteUrl: string | null = null;

    if (dto.type === RefundType.CREDIT_NOTE || dto.generateCreditNote) {
      creditNoteUrl = await this.pdf.generate(
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
          total: dto.amount,
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
        OrderDocumentType.CREDIT_NOTE,
        'FR',
      );
      await this.prisma.orderDocument.create({
        data: {
          orderId: order.id,
          type: OrderDocumentType.CREDIT_NOTE,
          fileUrl: creditNoteUrl,
        },
      });
    }

    const refund = await this.prisma.refund.create({
      data: {
        number,
        returnId: row.id,
        orderId: order.id,
        paymentId,
        type: dto.type,
        status: RefundStatus.COMPLETED,
        amount: dto.amount,
        currency: order.currency,
        reason: dto.reason,
        creditNoteUrl,
        processedAt: new Date(),
        processedById: adminId,
      },
    });

    if (paymentId) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REFUNDED },
      });
    }

    await this.prisma.returnRequest.update({
      where: { id: row.id },
      data: {
        status: ReturnStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const markOrder =
      dto.markOrderRefunded !== false &&
      (dto.type === RefundType.FULL || dto.amount >= orderTotal - 0.01);

    if (markOrder) {
      let current = await this.prisma.order.findUnique({
        where: { id: order.id },
      });
      if (current?.status === OrderStatus.DELIVERED) {
        await this.orders.updateStatus(
          order.id,
          { status: OrderStatus.RETURNED, note: `Return ${row.number}` },
          adminId,
        );
        current = await this.prisma.order.findUnique({
          where: { id: order.id },
        });
      }
      if (current?.status === OrderStatus.RETURNED) {
        await this.orders.updateStatus(
          order.id,
          {
            status: OrderStatus.REFUNDED,
            note: `Refund ${number} (${dto.type}) ${dto.amount} ${order.currency}`,
          },
          adminId,
        );
      }
    }

    await this.audit.log({
      userId: adminId,
      action: 'REFUND_COMPLETED',
      entity: 'Refund',
      entityId: refund.id,
      metadata: {
        returnId: row.id,
        amount: dto.amount,
        type: dto.type,
      },
    });

    return this.serialize(
      (await this.prisma.returnRequest.findUnique({
        where: { id: row.id },
        include: returnInclude,
      }))!,
    );
  }

  private async nextReturnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RET-${year}-`;
    const last = await this.prisma.returnRequest.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const seq = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async nextRefundNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RFD-${year}-`;
    const last = await this.prisma.refund.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const seq = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async findOrThrow(id: string) {
    const row = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: returnInclude,
    });
    if (!row) throw new NotFoundException('Return not found');
    return row;
  }

  private assertAccess(ownerId: string, userId: string, role: Role) {
    if (
      role === Role.ADMIN ||
      role === Role.DEVELOPER ||
      ownerId === userId
    ) {
      return;
    }
    throw new ForbiddenException('Access denied');
  }

  private serialize(
    row: Prisma.ReturnRequestGetPayload<{ include: typeof returnInclude }>,
  ) {
    return {
      ...row,
      refunds: row.refunds.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
      items: row.items.map((i) => ({
        ...i,
        orderItem: {
          ...i.orderItem,
          unitPrice: Number(i.orderItem.unitPrice),
          lineTotal: Number(i.orderItem.lineTotal),
          weightKg:
            i.orderItem.weightKg != null
              ? Number(i.orderItem.weightKg)
              : null,
        },
      })),
      order: row.order
        ? {
            ...row.order,
            total: Number(row.order.total),
          }
        : row.order,
    };
  }
}
