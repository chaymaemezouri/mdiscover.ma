import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryMode,
  Prisma,
  PromoType,
  PurchaseMode,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CartTotals = {
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  shippingFee: number;
  total: number;
  freeShipping: boolean;
  currency: string;
  weightKg: number;
};

@Injectable()
export class CartPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getTaxRate(): number {
    return Number(this.config.get('TAX_RATE') ?? 20);
  }

  unitPrice(product: {
    price: Prisma.Decimal;
    promoPrice: Prisma.Decimal | null;
  }, variant?: { price: Prisma.Decimal | null } | null): number {
    if (variant?.price != null) {
      return Number(variant.price);
    }
    return Number(product.promoPrice ?? product.price);
  }

  assertPurchasable(
    product: {
      purchaseMode: PurchaseMode;
      hybridThresholdQty: number | null;
      isActive: boolean;
      nameFr: string;
    },
    quantity: number,
  ) {
    if (!product.isActive) {
      throw new Error('PRODUCT_INACTIVE');
    }
    if (product.purchaseMode === PurchaseMode.QUOTE) {
      throw new Error('QUOTE_ONLY');
    }
    if (
      product.purchaseMode === PurchaseMode.HYBRID &&
      product.hybridThresholdQty != null &&
      quantity > product.hybridThresholdQty
    ) {
      throw new Error('HYBRID_THRESHOLD');
    }
  }

  async computeTotals(params: {
    items: Array<{
      quantity: number;
      product: {
        price: Prisma.Decimal;
        promoPrice: Prisma.Decimal | null;
        weightKg: Prisma.Decimal | null;
      };
      variant: {
        price: Prisma.Decimal | null;
        weightKg: Prisma.Decimal | null;
      } | null;
    }>;
    promo?: {
      type: PromoType;
      value: Prisma.Decimal;
      minOrderAmount: Prisma.Decimal | null;
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
      maxUses: number | null;
      usedCount: number;
    } | null;
    city?: string;
    region?: string;
    deliveryMode?: DeliveryMode;
    currency?: string;
  }): Promise<CartTotals> {
    const currency = params.currency ?? 'MAD';
    let subtotal = 0;
    let weightKg = 0;

    for (const item of params.items) {
      const unit = this.unitPrice(item.product, item.variant);
      subtotal += unit * item.quantity;
      const w = Number(item.variant?.weightKg ?? item.product.weightKg ?? 0);
      weightKg += w * item.quantity;
    }

    subtotal = round2(subtotal);
    weightKg = round3(weightKg);

    let discount = 0;
    let freeShipping = false;
    const promo = params.promo;
    if (promo && this.isPromoValid(promo, subtotal)) {
      if (promo.type === PromoType.PERCENT) {
        discount = round2((subtotal * Number(promo.value)) / 100);
      } else if (promo.type === PromoType.FIXED) {
        discount = Math.min(subtotal, Number(promo.value));
      } else if (promo.type === PromoType.FREE_SHIPPING) {
        freeShipping = true;
      }
    }

    const taxable = Math.max(0, subtotal - discount);
    const taxRate = this.getTaxRate();
    const taxAmount = round2((taxable * taxRate) / 100);

    // Livraison réglée avec le livreur, jamais facturée sur le site.
    const shippingFee = 0;
    const total = round2(taxable + taxAmount);

    return {
      subtotal,
      discount,
      taxRate,
      taxAmount,
      shippingFee,
      total,
      freeShipping,
      currency,
      weightKg,
    };
  }

  isPromoValid(
    promo: {
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
      maxUses: number | null;
      usedCount: number;
      minOrderAmount: Prisma.Decimal | null;
    },
    subtotal: number,
  ) {
    if (!promo.isActive) return false;
    const now = new Date();
    if (promo.startsAt && promo.startsAt > now) return false;
    if (promo.endsAt && promo.endsAt < now) return false;
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
    if (
      promo.minOrderAmount != null &&
      subtotal < Number(promo.minOrderAmount)
    ) {
      return false;
    }
    return true;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
