import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Public,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import {
  CreateCarrierDto,
  CreateShipmentDto,
  CreateShippingRateDto,
  CreateShippingZoneDto,
  EstimateShippingDto,
  UpdateShipmentStatusDto,
} from './dto/shipping.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Post('estimate')
  estimate(@Body() dto: EstimateShippingDto) {
    return this.shippingService.estimate(dto);
  }

  @Public()
  @Get('track/:trackingNumber')
  track(@Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.track(trackingNumber);
  }

  @Public()
  @Get('carriers')
  listCarriersPublic() {
    return this.shippingService.listCarriers(true);
  }

  @Roles(Role.ADMIN)
  @Get('admin/zones')
  listZones() {
    return this.shippingService.listZones();
  }

  @Roles(Role.ADMIN)
  @Post('admin/zones')
  createZone(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShippingZoneDto,
  ) {
    return this.shippingService.createZone(dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/rates')
  listRates() {
    return this.shippingService.listRates();
  }

  @Roles(Role.ADMIN)
  @Post('admin/rates')
  createRate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShippingRateDto,
  ) {
    return this.shippingService.createRate(dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/carriers')
  listCarriersAdmin() {
    return this.shippingService.listCarriers(false);
  }

  @Roles(Role.ADMIN)
  @Post('admin/carriers')
  createCarrier(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCarrierDto,
  ) {
    return this.shippingService.createCarrier(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/shipments')
  createShipment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shippingService.createShipment(dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/shipments/:id/status')
  updateShipmentStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shippingService.updateShipmentStatus(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/orders/:orderId/shipments')
  listOrderShipments(@Param('orderId') orderId: string) {
    return this.shippingService.listShipmentsForOrder(orderId);
  }
}
