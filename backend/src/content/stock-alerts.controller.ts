import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CreateStockAlertDto } from './dto/content.dto';
import { StockAlertsService } from './stock-alerts.service';

@Controller('stock-alerts')
export class StockAlertsController {
  constructor(private readonly stockAlertsService: StockAlertsService) {}

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.stockAlertsService.listMine(user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin(@Query('productId') productId?: string) {
    return this.stockAlertsService.listPendingAdmin(productId);
  }

  @Post()
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: CreateStockAlertDto) {
    return this.stockAlertsService.subscribe(user.id, user.email ?? null, dto);
  }

  @Delete(':productId')
  unsubscribe(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    return this.stockAlertsService.unsubscribe(user.id, productId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/:productId/notify')
  markNotified(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    return this.stockAlertsService.markNotified(productId, user.id);
  }
}
