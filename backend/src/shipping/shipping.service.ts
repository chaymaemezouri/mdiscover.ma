import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryMode,
  OrderStatus,
  ShipmentStatus,
  ShippingZoneType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCarrierDto,
  CreateShipmentDto,
  CreateShippingRateDto,
  CreateShippingZoneDto,
  EstimateShippingDto,
  UpdateShipmentStatusDto,
} from './dto/shipping.dto';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
  ) {}

  async estimate(dto: EstimateShippingDto) {
    const deliveryMode = dto.deliveryMode ?? DeliveryMode.STANDARD;
    const weightKg = dto.weightKg ?? 0;
    const orderAmount = dto.orderAmount ?? 0;
    const country = (dto.country ?? 'MA').toUpperCase();

    const result = await this.resolveRate({
      city: dto.city,
      region: dto.region,
      country,
      deliveryMode,
      weightKg,
      orderAmount,
    });

    return {
      currency: 'MAD',
      deliveryMode,
      weightKg,
      orderAmount,
      city: dto.city ?? null,
      region: dto.region ?? null,
      country,
      fee: result.fee,
      matchedRate: result.rate
        ? {
            id: result.rate.id,
            name: result.rate.name,
            zoneId: result.rate.zoneId,
            city: result.rate.city,
            region: result.rate.region,
            price: Number(result.rate.price),
          }
        : null,
      fallback: result.fallback,
    };
  }

  async resolveFee(params: {
    city?: string;
    region?: string;
    country?: string;
    deliveryMode: DeliveryMode;
    weightKg: number;
    orderAmount: number;
  }): Promise<number> {
    const { fee } = await this.resolveRate({
      ...params,
      country: params.country ?? 'MA',
    });
    return fee;
  }

  async createZone(dto: CreateShippingZoneDto, adminId: string) {
    const zone = await this.prisma.shippingZone.create({
      data: {
        name: dto.name,
        type: dto.type,
        country: dto.country ?? 'MA',
        codes: dto.codes.map((c) => c.trim().toLowerCase()),
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'SHIPPING_ZONE_CREATED',
      entity: 'ShippingZone',
      entityId: zone.id,
    });
    return zone;
  }

  listZones() {
    return this.prisma.shippingZone.findMany({
      include: { rates: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async createRate(dto: CreateShippingRateDto, adminId: string) {
    if (dto.zoneId) {
      const zone = await this.prisma.shippingZone.findUnique({
        where: { id: dto.zoneId },
      });
      if (!zone) throw new NotFoundException('Shipping zone not found');
    }
    const rate = await this.prisma.shippingRate.create({
      data: {
        name: dto.name,
        zoneId: dto.zoneId,
        city: dto.city,
        region: dto.region,
        country: dto.country ?? 'MA',
        minWeightKg: dto.minWeightKg ?? 0,
        maxWeightKg: dto.maxWeightKg,
        minOrderAmount: dto.minOrderAmount ?? 0,
        price: dto.price,
        deliveryMode: dto.deliveryMode ?? DeliveryMode.STANDARD,
        isActive: dto.isActive ?? true,
      },
      include: { zone: true },
    });
    await this.audit.log({
      userId: adminId,
      action: 'SHIPPING_RATE_CREATED',
      entity: 'ShippingRate',
      entityId: rate.id,
    });
    return rate;
  }

  listRates() {
    return this.prisma.shippingRate.findMany({
      include: { zone: true },
      orderBy: [{ country: 'asc' }, { price: 'asc' }],
    });
  }

  async createCarrier(dto: CreateCarrierDto, adminId: string) {
    const carrier = await this.prisma.carrier.create({
      data: {
        name: dto.name,
        code: dto.code.trim().toUpperCase(),
        trackingUrlTemplate: dto.trackingUrlTemplate,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'CARRIER_CREATED',
      entity: 'Carrier',
      entityId: carrier.id,
    });
    return carrier;
  }

  listCarriers(activeOnly = false) {
    return this.prisma.carrier.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createShipment(dto: CreateShipmentDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    let carrierName = dto.carrierName;
    let trackingUrl: string | null = null;
    let carrierId = dto.carrierId ?? null;

    if (dto.carrierId) {
      const carrier = await this.prisma.carrier.findUnique({
        where: { id: dto.carrierId },
      });
      if (!carrier || !carrier.isActive) {
        throw new NotFoundException('Carrier not found');
      }
      carrierName = carrier.name;
      carrierId = carrier.id;
      if (carrier.trackingUrlTemplate) {
        trackingUrl = carrier.trackingUrlTemplate.replace(
          '{trackingNumber}',
          encodeURIComponent(dto.trackingNumber),
        );
      }
    }

    if (!carrierName) {
      throw new BadRequestException('carrierId or carrierName is required');
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: dto.orderId,
        carrierId,
        carrierName,
        trackingNumber: dto.trackingNumber,
        trackingUrl,
        status: ShipmentStatus.LABEL_CREATED,
        notes: dto.notes,
      },
      include: { carrier: true },
    });

    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: {
        carrierName,
        trackingNumber: dto.trackingNumber,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'SHIPMENT_CREATED',
      entity: 'Shipment',
      entityId: shipment.id,
      metadata: { orderId: dto.orderId, trackingNumber: dto.trackingNumber },
    });

    if (dto.markOrderShipped) {
      const shippable: OrderStatus[] = [
        OrderStatus.READY_TO_SHIP,
        OrderStatus.PREPARING,
        OrderStatus.CONFIRMED,
      ];
      // Prefer READY_TO_SHIP → SHIPPED; otherwise advance step by step if needed
      if (order.status === OrderStatus.READY_TO_SHIP) {
        await this.orders.updateStatus(
          order.id,
          {
            status: OrderStatus.SHIPPED,
            carrierName,
            trackingNumber: dto.trackingNumber,
            note: 'Shipment created',
          },
          adminId,
        );
        await this.prisma.shipment.update({
          where: { id: shipment.id },
          data: { status: ShipmentStatus.SHIPPED, shippedAt: new Date() },
        });
      } else if (!shippable.includes(order.status) && order.status !== OrderStatus.SHIPPED) {
        // only sync fields; don't force invalid transition
      }
    }

    return this.prisma.shipment.findUnique({
      where: { id: shipment.id },
      include: { carrier: true, order: { select: { id: true, number: true, status: true } } },
    });
  }

  async updateShipmentStatus(
    id: string,
    dto: UpdateShipmentStatusDto,
    adminId: string,
  ) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const data: {
      status: ShipmentStatus;
      notes?: string;
      shippedAt?: Date;
      deliveredAt?: Date;
    } = {
      status: dto.status,
      notes: dto.notes,
    };
    if (dto.status === ShipmentStatus.SHIPPED || dto.status === ShipmentStatus.IN_TRANSIT) {
      data.shippedAt = shipment.shippedAt ?? new Date();
    }
    if (dto.status === ShipmentStatus.DELIVERED) {
      data.deliveredAt = new Date();
    }

    const updated = await this.prisma.shipment.update({
      where: { id },
      data,
      include: { carrier: true, order: true },
    });

    if (dto.status === ShipmentStatus.OUT_FOR_DELIVERY) {
      if (updated.order.status === OrderStatus.SHIPPED) {
        await this.orders.updateStatus(
          updated.orderId,
          { status: OrderStatus.OUT_FOR_DELIVERY, note: dto.notes },
          adminId,
        );
      }
    }
    if (dto.status === ShipmentStatus.DELIVERED) {
      if (
        updated.order.status === OrderStatus.SHIPPED ||
        updated.order.status === OrderStatus.OUT_FOR_DELIVERY
      ) {
        await this.orders.updateStatus(
          updated.orderId,
          { status: OrderStatus.DELIVERED, note: dto.notes },
          adminId,
        );
      }
    }

    await this.audit.log({
      userId: adminId,
      action: 'SHIPMENT_STATUS_UPDATED',
      entity: 'Shipment',
      entityId: id,
      metadata: { status: dto.status },
    });

    return this.prisma.shipment.findUnique({
      where: { id },
      include: { carrier: true, order: true },
    });
  }

  async listShipmentsForOrder(orderId: string) {
    return this.prisma.shipment.findMany({
      where: { orderId },
      include: { carrier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async track(trackingNumber: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber },
      include: {
        carrier: true,
        order: { select: { id: true, number: true, status: true } },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  private async resolveRate(params: {
    city?: string;
    region?: string;
    country: string;
    deliveryMode: DeliveryMode;
    weightKg: number;
    orderAmount: number;
  }) {
    const rates = await this.prisma.shippingRate.findMany({
      where: {
        isActive: true,
        deliveryMode: params.deliveryMode,
        country: params.country,
        minOrderAmount: { lte: params.orderAmount },
        minWeightKg: { lte: params.weightKg },
        OR: [{ maxWeightKg: null }, { maxWeightKg: { gte: params.weightKg } }],
      },
      include: { zone: true },
      orderBy: { price: 'asc' },
    });

    const city = params.city?.trim().toLowerCase();
    const region = params.region?.trim().toLowerCase();

    // 1) Zone CITY match
    const zoneCity = rates.find(
      (r) =>
        r.zone?.type === ShippingZoneType.CITY &&
        city &&
        r.zone.codes.some((c) => c === city),
    );
    if (zoneCity) return { fee: Number(zoneCity.price), rate: zoneCity, fallback: false };

    // 2) Legacy city field
    const legacyCity = rates.find(
      (r) => r.city && city && r.city.toLowerCase() === city,
    );
    if (legacyCity) {
      return { fee: Number(legacyCity.price), rate: legacyCity, fallback: false };
    }

    // 3) Zone REGION / ZONE match
    const zoneRegion = rates.find(
      (r) =>
        (r.zone?.type === ShippingZoneType.REGION ||
          r.zone?.type === ShippingZoneType.ZONE) &&
        region &&
        r.zone.codes.some((c) => c === region),
    );
    if (zoneRegion) {
      return { fee: Number(zoneRegion.price), rate: zoneRegion, fallback: false };
    }

    const legacyRegion = rates.find(
      (r) => r.region && region && r.region.toLowerCase() === region,
    );
    if (legacyRegion) {
      return {
        fee: Number(legacyRegion.price),
        rate: legacyRegion,
        fallback: false,
      };
    }

    // 4) Country zone / national rate
    const zoneCountry = rates.find(
      (r) => r.zone?.type === ShippingZoneType.COUNTRY,
    );
    if (zoneCountry) {
      return {
        fee: Number(zoneCountry.price),
        rate: zoneCountry,
        fallback: false,
      };
    }

    const national = rates.find((r) => !r.city && !r.region && !r.zoneId);
    if (national) {
      return { fee: Number(national.price), rate: national, fallback: false };
    }

    const fallbackFee = 29;
    return { fee: fallbackFee, rate: null, fallback: true };
  }
}
