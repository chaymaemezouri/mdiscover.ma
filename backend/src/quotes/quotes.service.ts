import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  Prisma,
  QuoteStatus,
  Role,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminPrepareQuoteDto,
  ConvertQuoteDto,
  CreateQuoteDto,
  RequestQuoteModificationDto,
} from './dto/quote.dto';
import { QuotePdfService } from './quote-pdf.service';

const quoteInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          slugFr: true,
          nameFr: true,
          purchaseMode: true,
        },
      },
      variant: { select: { id: true, sku: true, nameFr: true } },
    },
  },
  attachments: true,
  history: { orderBy: { createdAt: 'asc' as const } },
  order: { select: { id: true, number: true, status: true } },
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      professionalProfile: {
        select: {
          companyName: true,
          contactPerson: true,
          ice: true,
          taxId: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: QuotePdfService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, dto: CreateQuoteDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { professionalProfile: true, individualProfile: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: true },
    });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('One or more products are invalid');
    }

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(`Invalid variant for ${product.sku}`);
        }
      }
    }

    const number = await this.nextQuoteNumber();
    const companyName =
      dto.companyName ??
      user.professionalProfile?.companyName ??
      null;
    const contactName =
      dto.contactName ??
      user.professionalProfile?.contactPerson ??
      (user.individualProfile
        ? `${user.individualProfile.firstName} ${user.individualProfile.lastName}`
        : null);

    const quote = await this.prisma.quote.create({
      data: {
        number,
        userId,
        status: QuoteStatus.REQUESTED,
        destinationCountry: dto.destinationCountry,
        companyName,
        contactName,
        contactEmail: dto.contactEmail ?? user.email,
        contactPhone: dto.contactPhone ?? user.phone,
        companyAddress: dto.companyAddress,
        taxId: dto.taxId ?? user.professionalProfile?.taxId,
        ice: dto.ice ?? user.professionalProfile?.ice,
        desiredDeadline: dto.desiredDeadline
          ? new Date(dto.desiredDeadline)
          : null,
        message: dto.message,
        items: {
          create: dto.items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            const variant = item.variantId
              ? product.variants.find((v) => v.id === item.variantId)
              : null;
            return {
              productId: item.productId,
              variantId: item.variantId,
              sku: variant?.sku ?? product.sku,
              nameFr: variant
                ? `${product.nameFr} — ${variant.nameFr}`
                : product.nameFr,
              nameEn: variant
                ? `${product.nameEn} — ${variant.nameEn}`
                : product.nameEn,
              packaging: item.packaging?.trim() || product.packaging || null,
              quantity: item.quantity,
            };
          }),
        },
        attachments: dto.attachments?.length
          ? {
              create: dto.attachments.map((a) => ({
                fileUrl: a.fileUrl,
                fileName: a.fileName,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
              })),
            }
          : undefined,
        history: {
          create: {
            fromStatus: null,
            toStatus: QuoteStatus.REQUESTED,
            note: 'Quote request created',
            changedBy: userId,
          },
        },
      },
      include: quoteInclude,
    });

    await this.audit.log({
      userId,
      action: 'QUOTE_REQUESTED',
      entity: 'Quote',
      entityId: quote.id,
      metadata: { number: quote.number },
    });

    return this.serialize(quote);
  }

  async listMine(userId: string) {
    const quotes = await this.prisma.quote.findMany({
      where: { userId },
      include: quoteInclude,
      orderBy: { createdAt: 'desc' },
    });
    return quotes.map((q) => this.serialize(q));
  }

  async getOne(id: string, userId: string, role: Role) {
    const quote = await this.findQuoteOrThrow(id);
    this.assertCanAccess(quote.userId, userId, role);
    await this.expireIfNeeded(quote);
    const fresh = await this.findQuoteOrThrow(id);
    return this.serialize(fresh);
  }

  async listAdmin(status?: QuoteStatus) {
    const quotes = await this.prisma.quote.findMany({
      where: status ? { status } : undefined,
      include: quoteInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return quotes.map((q) => this.serialize(q));
  }

  async markInReview(id: string, adminId: string) {
    const quote = await this.findQuoteOrThrow(id);
    if (
      quote.status !== QuoteStatus.REQUESTED &&
      quote.status !== QuoteStatus.MODIFICATION_REQUESTED
    ) {
      throw new BadRequestException(
        'Ce devis ne peut pas passer en revue dans cet état',
      );
    }
    return this.transition(quote.id, QuoteStatus.IN_REVIEW, adminId, 'Admin reviewing');
  }

  async adminReject(id: string, adminId: string, reason: string) {
    const quote = await this.findQuoteOrThrow(id);
    const rejectable: QuoteStatus[] = [
      QuoteStatus.REQUESTED,
      QuoteStatus.IN_REVIEW,
      QuoteStatus.SENT,
      QuoteStatus.MODIFICATION_REQUESTED,
    ];
    if (!rejectable.includes(quote.status)) {
      throw new BadRequestException(
        'Ce devis ne peut pas être refusé dans cet état',
      );
    }
    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.REJECTED,
        respondedAt: new Date(),
        adminNote: reason,
      },
      include: quoteInclude,
    });
    await this.addHistory(
      id,
      quote.status,
      QuoteStatus.REJECTED,
      adminId,
      reason,
    );
    await this.audit.log({
      userId: adminId,
      action: 'QUOTE_ADMIN_REJECTED',
      entity: 'Quote',
      entityId: id,
      metadata: { reason },
    });
    return this.serialize(updated);
  }

  async prepareAndOptionallySend(
    id: string,
    dto: AdminPrepareQuoteDto,
    adminId: string,
  ) {
    const quote = await this.findQuoteOrThrow(id);
    const priceable: QuoteStatus[] = [
      QuoteStatus.REQUESTED,
      QuoteStatus.IN_REVIEW,
      QuoteStatus.MODIFICATION_REQUESTED,
      QuoteStatus.SENT,
    ];
    if (!priceable.includes(quote.status)) {
      throw new BadRequestException('Quote cannot be priced in this status');
    }

    const itemIds = dto.items.map((i) => i.itemId);
    const existingIds = quote.items.map((i) => i.id);
    for (const itemId of itemIds) {
      if (!existingIds.includes(itemId)) {
        throw new BadRequestException(`Unknown quote item: ${itemId}`);
      }
    }

    const taxRate =
      dto.taxRate ?? Number(this.config.get('TAX_RATE') ?? 20);
    let subtotal = 0;

    for (const offer of dto.items) {
      const lineTotal = round2(offer.quantity * offer.unitPrice);
      subtotal += lineTotal;
      await this.prisma.quoteItem.update({
        where: { id: offer.itemId },
        data: {
          quantity: offer.quantity,
          unitPrice: offer.unitPrice,
          lineTotal,
          packaging: offer.packaging,
        },
      });
    }

    subtotal = round2(subtotal);
    const discount = round2(dto.discount ?? 0);
    if (discount > subtotal) {
      throw new BadRequestException('Discount cannot exceed subtotal');
    }
    const shippingFee = round2(dto.shippingFee ?? 0);
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = round2((taxable * taxRate) / 100);
    const total = round2(taxable + taxAmount + shippingFee);

    await this.prisma.quote.update({
      where: { id },
      data: {
        subtotal,
        discount,
        taxRate,
        taxAmount,
        shippingFee,
        total,
        validityDate: new Date(dto.validityDate),
        conditions: dto.conditions,
        adminNote: dto.adminNote,
        status:
          quote.status === QuoteStatus.REQUESTED ||
          quote.status === QuoteStatus.MODIFICATION_REQUESTED
            ? QuoteStatus.IN_REVIEW
            : quote.status,
      },
    });

    if (
      quote.status === QuoteStatus.REQUESTED ||
      quote.status === QuoteStatus.MODIFICATION_REQUESTED
    ) {
      await this.addHistory(
        id,
        quote.status,
        QuoteStatus.IN_REVIEW,
        adminId,
        'Pricing prepared',
      );
    }

    const priced = await this.findQuoteOrThrow(id);
    const pdfUrl = await this.pdf.generate({
      number: priced.number,
      createdAt: priced.createdAt,
      validityDate: priced.validityDate,
      companyName: priced.companyName,
      contactName: priced.contactName,
      contactEmail: priced.contactEmail,
      contactPhone: priced.contactPhone,
      companyAddress: priced.companyAddress,
      ice: priced.ice,
      taxId: priced.taxId,
      destinationCountry: priced.destinationCountry,
      conditions: priced.conditions,
      currency: priced.currency,
      subtotal: Number(priced.subtotal ?? 0),
      discount: Number(priced.discount),
      taxRate: Number(priced.taxRate ?? taxRate),
      taxAmount: Number(priced.taxAmount ?? 0),
      shippingFee: Number(priced.shippingFee),
      total: Number(priced.total ?? 0),
      items: priced.items.map((i) => ({
        sku: i.sku,
        nameFr: i.nameFr,
        packaging: i.packaging,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice ?? 0),
        lineTotal: Number(i.lineTotal ?? 0),
      })),
    });

    await this.prisma.quote.update({
      where: { id },
      data: { pdfUrl },
    });

    await this.audit.log({
      userId: adminId,
      action: 'QUOTE_PREPARED',
      entity: 'Quote',
      entityId: id,
      metadata: { total, pdfUrl },
    });

    if (dto.send) {
      return this.send(id, adminId);
    }

    return this.serialize(await this.findQuoteOrThrow(id));
  }

  async send(id: string, adminId: string) {
    const quote = await this.findQuoteOrThrow(id);
    if (quote.total == null || !quote.pdfUrl || !quote.validityDate) {
      throw new BadRequestException(
        'Quote must be priced with PDF and validity before sending',
      );
    }
    const sendable: QuoteStatus[] = [
      QuoteStatus.IN_REVIEW,
      QuoteStatus.SENT,
      QuoteStatus.MODIFICATION_REQUESTED,
    ];
    if (!sendable.includes(quote.status)) {
      throw new BadRequestException('Quote cannot be sent in this status');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.SENT,
        sentAt: new Date(),
      },
      include: quoteInclude,
    });
    await this.addHistory(
      id,
      quote.status,
      QuoteStatus.SENT,
      adminId,
      'Quote sent to client',
    );
    await this.audit.log({
      userId: adminId,
      action: 'QUOTE_SENT',
      entity: 'Quote',
      entityId: id,
    });
    return this.serialize(updated);
  }

  async accept(id: string, userId: string) {
    const quote = await this.findQuoteOrThrow(id);
    this.assertOwner(quote.userId, userId);
    await this.expireIfNeeded(quote);
    const current = await this.findQuoteOrThrow(id);
    if (current.status !== QuoteStatus.SENT) {
      throw new BadRequestException('Only a sent quote can be accepted');
    }
    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.ACCEPTED,
        respondedAt: new Date(),
      },
      include: quoteInclude,
    });
    await this.addHistory(
      id,
      QuoteStatus.SENT,
      QuoteStatus.ACCEPTED,
      userId,
      'Client accepted quote',
    );
    await this.audit.log({
      userId,
      action: 'QUOTE_ACCEPTED',
      entity: 'Quote',
      entityId: id,
    });
    return this.serialize(updated);
  }

  async reject(id: string, userId: string) {
    const quote = await this.findQuoteOrThrow(id);
    this.assertOwner(quote.userId, userId);
    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException('Only a sent quote can be rejected');
    }
    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.REJECTED,
        respondedAt: new Date(),
      },
      include: quoteInclude,
    });
    await this.addHistory(
      id,
      QuoteStatus.SENT,
      QuoteStatus.REJECTED,
      userId,
      'Client rejected quote',
    );
    await this.audit.log({
      userId,
      action: 'QUOTE_REJECTED',
      entity: 'Quote',
      entityId: id,
    });
    return this.serialize(updated);
  }

  async requestModification(
    id: string,
    userId: string,
    dto: RequestQuoteModificationDto,
  ) {
    const quote = await this.findQuoteOrThrow(id);
    this.assertOwner(quote.userId, userId);
    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException(
        'Only a sent quote can request modification',
      );
    }
    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.MODIFICATION_REQUESTED,
        clientModificationNote: dto.note,
        respondedAt: new Date(),
      },
      include: quoteInclude,
    });
    await this.addHistory(
      id,
      QuoteStatus.SENT,
      QuoteStatus.MODIFICATION_REQUESTED,
      userId,
      dto.note,
    );
    await this.audit.log({
      userId,
      action: 'QUOTE_MODIFICATION_REQUESTED',
      entity: 'Quote',
      entityId: id,
    });
    return this.serialize(updated);
  }

  async convertToOrder(id: string, userId: string, dto: ConvertQuoteDto) {
    if (dto.paymentMethod === PaymentMethod.STRIPE) {
      throw new BadRequestException(
        `Payment method ${dto.paymentMethod} is not active yet`,
      );
    }

    const quote = await this.findQuoteOrThrow(id);
    this.assertOwner(quote.userId, userId);
    await this.expireIfNeeded(quote);
    const current = await this.findQuoteOrThrow(id);

    if (
      current.status !== QuoteStatus.ACCEPTED &&
      current.status !== QuoteStatus.SENT
    ) {
      throw new BadRequestException(
        'Quote must be accepted (or sent then paid) before conversion',
      );
    }
    if (current.order) {
      throw new BadRequestException('Quote already converted to an order');
    }
    if (current.total == null) {
      throw new BadRequestException('Quote has no total');
    }

    const shippingAddress = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });
    if (!shippingAddress) {
      throw new NotFoundException('Shipping address not found');
    }
    let billingAddress = shippingAddress;
    if (dto.billingAddressId) {
      const found = await this.prisma.address.findFirst({
        where: { id: dto.billingAddressId, userId },
      });
      if (!found) {
        throw new NotFoundException('Billing address not found');
      }
      billingAddress = found;
    }

    const orderNumber = await this.nextOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      if (current.status === QuoteStatus.SENT) {
        await tx.quote.update({
          where: { id },
          data: {
            status: QuoteStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        });
        await tx.quoteStatusHistory.create({
          data: {
            quoteId: id,
            fromStatus: QuoteStatus.SENT,
            toStatus: QuoteStatus.ACCEPTED,
            note: 'Auto-accepted on convert',
            changedBy: userId,
          },
        });
      }

      const created = await tx.order.create({
        data: {
          number: orderNumber,
          userId,
          quoteId: id,
          status: OrderStatus.PENDING_PAYMENT,
          currency: current.currency,
          subtotal: current.subtotal ?? 0,
          discount: current.discount,
          taxRate: current.taxRate ?? Number(this.config.get('TAX_RATE') ?? 20),
          taxAmount: current.taxAmount ?? 0,
          shippingFee: current.shippingFee,
          total: current.total ?? 0,
          paymentMethod: dto.paymentMethod,
          deliveryMode: dto.deliveryMode ?? DeliveryMode.STANDARD,
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
          shippingAddressSnap: this.snapAddress(shippingAddress),
          billingAddressSnap: this.snapAddress(billingAddress),
          customerNote: dto.customerNote ?? current.message,
          items: {
            create: current.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              sku: item.sku,
              nameFr: item.nameFr,
              nameEn: item.nameEn,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? 0,
              lineTotal: item.lineTotal ?? 0,
            })),
          },
          history: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING_PAYMENT,
              note: `Created from quote ${current.number}`,
              changedBy: userId,
            },
          },
        },
        include: { items: true },
      });

      await tx.quote.update({
        where: { id },
        data: { status: QuoteStatus.CONVERTED },
      });
      await tx.quoteStatusHistory.create({
        data: {
          quoteId: id,
          fromStatus: QuoteStatus.ACCEPTED,
          toStatus: QuoteStatus.CONVERTED,
          note: `Converted to order ${created.number}`,
          changedBy: userId,
        },
      });

      return created;
    });

    await this.audit.log({
      userId,
      action: 'QUOTE_CONVERTED_TO_ORDER',
      entity: 'Quote',
      entityId: id,
      metadata: { orderId: order.id, orderNumber: order.number },
    });

    return {
      quoteId: id,
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        taxRate: Number(order.taxRate),
        taxAmount: Number(order.taxAmount),
        shippingFee: Number(order.shippingFee),
        total: Number(order.total),
      },
      nextStep:
        dto.paymentMethod === PaymentMethod.BANK_TRANSFER
          ? 'Upload bank transfer proof (payment module)'
          : 'Proceed to CMI payment (payment module)',
    };
  }

  private async transition(
    id: string,
    toStatus: QuoteStatus,
    actorId: string,
    note?: string,
  ) {
    const quote = await this.findQuoteOrThrow(id);
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: toStatus },
      include: quoteInclude,
    });
    await this.addHistory(id, quote.status, toStatus, actorId, note);
    return this.serialize(updated);
  }

  private async addHistory(
    quoteId: string,
    fromStatus: QuoteStatus | null,
    toStatus: QuoteStatus,
    changedBy: string,
    note?: string,
  ) {
    await this.prisma.quoteStatusHistory.create({
      data: { quoteId, fromStatus, toStatus, changedBy, note },
    });
  }

  private async expireIfNeeded(
    quote: Prisma.QuoteGetPayload<{ include: typeof quoteInclude }>,
  ) {
    const expirable: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.IN_REVIEW];
    if (
      quote.validityDate &&
      quote.validityDate < new Date() &&
      expirable.includes(quote.status)
    ) {
      await this.prisma.quote.update({
        where: { id: quote.id },
        data: { status: QuoteStatus.EXPIRED },
      });
      await this.addHistory(
        quote.id,
        quote.status,
        QuoteStatus.EXPIRED,
        'system',
        'Validity date passed',
      );
    }
  }

  private async findQuoteOrThrow(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  private assertOwner(ownerId: string, userId: string) {
    if (ownerId !== userId) {
      throw new ForbiddenException('Not your quote');
    }
  }

  private assertCanAccess(ownerId: string, userId: string, role: Role) {
    if (
      ownerId === userId ||
      role === Role.ADMIN ||
      role === Role.DEVELOPER
    ) {
      return;
    }
    throw new ForbiddenException('Not your quote');
  }

  private serialize(
    quote: Prisma.QuoteGetPayload<{ include: typeof quoteInclude }>,
  ) {
    return {
      ...quote,
      subtotal: quote.subtotal != null ? Number(quote.subtotal) : null,
      discount: Number(quote.discount),
      taxRate: quote.taxRate != null ? Number(quote.taxRate) : null,
      taxAmount: quote.taxAmount != null ? Number(quote.taxAmount) : null,
      shippingFee: Number(quote.shippingFee),
      total: quote.total != null ? Number(quote.total) : null,
      items: quote.items.map((i) => ({
        ...i,
        unitPrice: i.unitPrice != null ? Number(i.unitPrice) : null,
        lineTotal: i.lineTotal != null ? Number(i.lineTotal) : null,
      })),
    };
  }

  private snapAddress(address: {
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postalCode: string | null;
    country: string;
    phone: string | null;
    label: string | null;
  }): Prisma.InputJsonValue {
    return {
      label: address.label,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
    };
  }

  private async nextQuoteNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.quote.count({
      where: {
        createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
      },
    });
    return `DV-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async nextOrderNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count({
      where: {
        createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
      },
    });
    return `MD-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
