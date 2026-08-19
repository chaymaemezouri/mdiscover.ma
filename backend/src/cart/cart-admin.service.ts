import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePromoCodeDto,
  CreateShippingRateDto,
} from './dto/admin-cart.dto';

@Injectable()
export class CartAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPromo(dto: CreatePromoCodeDto, adminId: string) {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.prisma.promoCode.findUnique({ where: { code } });
    if (exists) {
      throw new ConflictException('Promo code already exists');
    }
    const promo = await this.prisma.promoCode.create({
      data: {
        code,
        type: dto.type,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount,
        maxUses: dto.maxUses,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'PROMO_CREATED',
      entity: 'PromoCode',
      entityId: promo.id,
    });
    return promo;
  }

  listPromos() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updatePromo(
    id: string,
    dto: { isActive?: boolean },
    adminId: string,
  ) {
    const promo = await this.prisma.promoCode.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
    await this.audit.log({
      userId: adminId,
      action: 'PROMO_UPDATED',
      entity: 'PromoCode',
      entityId: id,
    });
    return promo;
  }

  async createShippingRate(dto: CreateShippingRateDto, adminId: string) {
    const rate = await this.prisma.shippingRate.create({
      data: {
        name: dto.name,
        city: dto.city,
        region: dto.region,
        country: dto.country ?? 'MA',
        minWeightKg: dto.minWeightKg ?? 0,
        maxWeightKg: dto.maxWeightKg,
        minOrderAmount: dto.minOrderAmount ?? 0,
        price: dto.price,
        deliveryMode: dto.deliveryMode,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'SHIPPING_RATE_CREATED',
      entity: 'ShippingRate',
      entityId: rate.id,
    });
    return rate;
  }

  listShippingRates() {
    return this.prisma.shippingRate.findMany({
      where: { isActive: true },
      orderBy: [{ city: 'asc' }, { price: 'asc' }],
    });
  }
}
