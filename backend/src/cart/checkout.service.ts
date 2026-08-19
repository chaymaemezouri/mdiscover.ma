import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartPricingService } from './cart-pricing.service';
import { CartService } from './cart.service';
import { CheckoutDto } from './dto/cart.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly pricing: CartPricingService,
    private readonly audit: AuditService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    if (
      dto.paymentMethod !== PaymentMethod.BANK_TRANSFER &&
      dto.paymentMethod !== PaymentMethod.COD
    ) {
      throw new BadRequestException(
        `Payment method ${dto.paymentMethod} is not available`,
      );
    }

    const cart = await this.cartService.getOrCreateCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
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

    for (const item of cart.items) {
      try {
        this.pricing.assertPurchasable(item.product, item.quantity);
      } catch {
        throw new BadRequestException(
          `Product ${item.product.nameFr} cannot be purchased directly with this quantity`,
        );
      }
      const available = item.variant ? item.variant.stockQty : item.product.stockQty;
      if (item.quantity > available) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.sku} (available: ${available})`,
        );
      }
    }

    const totals = await this.pricing.computeTotals({
      items: cart.items,
      promo: cart.promoCode,
      city: shippingAddress.city,
      region: shippingAddress.region ?? undefined,
      deliveryMode: DeliveryMode.STANDARD,
      currency: cart.currency,
    });

    const orderNumber = await this.nextOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        if (item.variantId) {
          const updated = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              stockQty: { gte: item.quantity },
            },
            data: { stockQty: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            throw new BadRequestException(
              `Stock conflict for variant ${item.variantId}`,
            );
          }
        }
        const updatedProduct = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQty: { gte: item.quantity },
          },
          data: {
            stockQty: { decrement: item.quantity },
            salesCount: { increment: item.quantity },
          },
        });
        if (updatedProduct.count === 0) {
          throw new BadRequestException(
            `Stock conflict for product ${item.product.sku}`,
          );
        }
      }

      const initialStatus =
        dto.paymentMethod === PaymentMethod.COD
          ? OrderStatus.CONFIRMED
          : OrderStatus.PENDING_PAYMENT;

      const created = await tx.order.create({
        data: {
          number: orderNumber,
          userId,
          status: initialStatus,
          currency: cart.currency,
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          shippingFee: totals.shippingFee,
          total: totals.total,
          promoCodeId: cart.promoCodeId,
          promoCodeSnapshot: cart.promoCode?.code,
          paymentMethod: dto.paymentMethod,
          deliveryMode: DeliveryMode.STANDARD,
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
          shippingAddressSnap: this.snapAddress(shippingAddress),
          billingAddressSnap: this.snapAddress(billingAddress),
          customerNote: dto.customerNote,
          items: {
            create: cart.items.map((item) => {
              const unitPrice = this.pricing.unitPrice(
                item.product,
                item.variant,
              );
              return {
                productId: item.productId,
                variantId: item.variantId,
                sku: item.variant?.sku ?? item.product.sku,
                nameFr: item.variant
                  ? `${item.product.nameFr} — ${item.variant.nameFr}`
                  : item.product.nameFr,
                nameEn: item.variant
                  ? `${item.product.nameEn} — ${item.variant.nameEn}`
                  : item.product.nameEn,
                quantity: item.quantity,
                unitPrice,
                lineTotal: round2(unitPrice * item.quantity),
                weightKg: Number(
                  item.variant?.weightKg ?? item.product.weightKg ?? 0,
                ),
              };
            }),
          },
          history: {
            create: {
              fromStatus: null,
              toStatus: initialStatus,
              note: 'Order created from cart checkout',
              changedBy: userId,
            },
          },
          payments:
            dto.paymentMethod === PaymentMethod.COD
              ? {
                  create: {
                    provider: PaymentMethod.COD,
                    status: PaymentStatus.PENDING,
                    amount: totals.total,
                    currency: cart.currency,
                  },
                }
              : undefined,
        },
        include: { items: true, history: true },
      });

      if (cart.promoCodeId) {
        await tx.promoCode.update({
          where: { id: cart.promoCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { promoCodeId: null },
      });

      return created;
    });

    await this.audit.log({
      userId,
      action: 'ORDER_CREATED_CHECKOUT',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        number: order.number,
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
      },
    });

    return {
      ...order,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      taxRate: Number(order.taxRate),
      taxAmount: Number(order.taxAmount),
      shippingFee: Number(order.shippingFee),
      total: Number(order.total),
      nextStep:
        dto.paymentMethod === PaymentMethod.COD
          ? 'Pay cash on delivery'
          : 'Upload bank transfer proof (payment module)',
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

  private async nextOrderNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
        },
      },
    });
    return `MD-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
