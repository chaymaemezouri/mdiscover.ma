import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryMode, PurchaseMode } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartPricingService } from './cart-pricing.service';
import {
  AddCartItemDto,
  ApplyPromoDto,
  EstimateShippingDto,
  UpdateCartItemDto,
} from './dto/cart.dto';

const cartInclude = {
  promoCode: true,
  items: {
    include: {
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      variant: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: CartPricingService,
    private readonly audit: AuditService,
  ) {}

  async getOrCreateCart(userId: string) {
    const existing = await this.prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    if (existing) {
      return existing;
    }
    return this.prisma.cart.create({
      data: { userId },
      include: cartInclude,
    });
  }

  async getCartView(
    userId: string,
    estimate?: EstimateShippingDto,
  ) {
    const cart = await this.getOrCreateCart(userId);
    return this.toView(cart, estimate);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    try {
      this.pricing.assertPurchasable(product, dto.quantity);
    } catch (e) {
      this.throwPurchaseError(e, product);
    }

    let variant = null;
    if (dto.variantId) {
      variant = product.variants.find((v) => v.id === dto.variantId) ?? null;
      if (!variant || !variant.isActive) {
        throw new NotFoundException('Variant not found');
      }
    }

    const available = variant ? variant.stockQty : product.stockQty;
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
      },
    });
    const nextQty = (existing?.quantity ?? 0) + dto.quantity;
    if (nextQty > available) {
      throw new BadRequestException(`Insufficient stock (available: ${available})`);
    }

    try {
      this.pricing.assertPurchasable(product, nextQty);
    } catch (e) {
      this.throwPurchaseError(e, product);
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId,
          quantity: dto.quantity,
        },
      });
    }

    await this.audit.log({
      userId,
      action: 'CART_ITEM_ADDED',
      entity: 'Cart',
      entityId: cart.id,
      metadata: { productId: dto.productId, quantity: dto.quantity },
    });

    return this.getCartView(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true, variant: true },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    try {
      this.pricing.assertPurchasable(item.product, dto.quantity);
    } catch (e) {
      this.throwPurchaseError(e, item.product);
    }

    const available = item.variant ? item.variant.stockQty : item.product.stockQty;
    if (dto.quantity > available) {
      throw new BadRequestException(`Insufficient stock (available: ${available})`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCartView(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCartView(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: null },
    });
    return this.getCartView(userId);
  }

  async applyPromo(userId: string, dto: ApplyPromoDto) {
    const cart = await this.getOrCreateCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (!promo) {
      throw new NotFoundException('Promo code not found');
    }

    const subtotal = cart.items.reduce((sum, item) => {
      return (
        sum +
        this.pricing.unitPrice(item.product, item.variant) * item.quantity
      );
    }, 0);

    if (!this.pricing.isPromoValid(promo, subtotal)) {
      throw new BadRequestException('Promo code is not applicable');
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: promo.id },
    });

    await this.audit.log({
      userId,
      action: 'CART_PROMO_APPLIED',
      entity: 'Cart',
      entityId: cart.id,
      metadata: { code: promo.code },
    });

    return this.getCartView(userId);
  }

  async removePromo(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: null },
    });
    return this.getCartView(userId);
  }

  private async toView(
    cart: Awaited<ReturnType<CartService['getOrCreateCart']>>,
    estimate?: EstimateShippingDto,
  ) {
    const items = cart.items.map((item) => {
      const unitPrice = this.pricing.unitPrice(item.product, item.variant);
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        lineTotal: round2(unitPrice * item.quantity),
        product: {
          id: item.product.id,
          sku: item.product.sku,
          nameFr: item.product.nameFr,
          nameEn: item.product.nameEn,
          slugFr: item.product.slugFr,
          slugEn: item.product.slugEn,
          purchaseMode: item.product.purchaseMode,
          hybridThresholdQty: item.product.hybridThresholdQty,
          stockQty: item.product.stockQty,
          image: item.product.images[0] ?? null,
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              sku: item.variant.sku,
              nameFr: item.variant.nameFr,
              nameEn: item.variant.nameEn,
              stockQty: item.variant.stockQty,
            }
          : null,
      };
    });

    const totals = await this.pricing.computeTotals({
      items: cart.items,
      promo: cart.promoCode,
      city: estimate?.city,
      region: estimate?.region,
      deliveryMode: estimate?.deliveryMode ?? DeliveryMode.STANDARD,
      currency: cart.currency,
    });

    return {
      id: cart.id,
      currency: cart.currency,
      promoCode: cart.promoCode
        ? {
            code: cart.promoCode.code,
            type: cart.promoCode.type,
            value: Number(cart.promoCode.value),
          }
        : null,
      items,
      totals,
      paymentMethods: [
        { code: 'BANK_TRANSFER', enabled: true, label: 'Paiement bancaire' },
        { code: 'COD', enabled: true, label: 'Paiement à la livraison' },
      ],
      deliveryModes: [DeliveryMode.STANDARD],
    };
  }

  private throwPurchaseError(
    e: unknown,
    product: { nameFr: string; hybridThresholdQty: number | null; purchaseMode: PurchaseMode },
  ): never {
    const code = e instanceof Error ? e.message : 'PURCHASE_ERROR';
    if (code === 'QUOTE_ONLY') {
      throw new BadRequestException(
        `Product "${product.nameFr}" requires a quote request`,
      );
    }
    if (code === 'HYBRID_THRESHOLD') {
      throw new BadRequestException(
        `Quantity exceeds direct-purchase limit (${product.hybridThresholdQty}). Please request a quote.`,
      );
    }
    if (code === 'PRODUCT_INACTIVE') {
      throw new BadRequestException('Product is not available');
    }
    throw new BadRequestException('Cannot add product to cart');
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
