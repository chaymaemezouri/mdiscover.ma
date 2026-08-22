import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePromoCodeDto,
  CreateShippingRateDto,
  UpdatePromoCodeDto,
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

  async updatePromo(id: string, dto: UpdatePromoCodeDto, adminId: string) {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Promo code not found');
    }

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const clash = await this.prisma.promoCode.findFirst({
        where: { code, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('Promo code already exists');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minOrderAmount !== undefined) {
      data.minOrderAmount = dto.minOrderAmount;
    }
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.startsAt !== undefined) {
      data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const promo = await this.prisma.promoCode.update({
      where: { id },
      data,
    });
    await this.audit.log({
      userId: adminId,
      action: 'PROMO_UPDATED',
      entity: 'PromoCode',
      entityId: id,
    });
    return promo;
  }

  async removePromo(id: string, adminId: string) {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Promo code not found');
    }

    const inUse = await this.prisma.cart.count({ where: { promoCodeId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        'Ce code est encore lié à des paniers. Désactivez-le plutôt.',
      );
    }

    await this.prisma.promoCode.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: 'PROMO_DELETED',
      entity: 'PromoCode',
      entityId: id,
    });
    return { success: true };
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
