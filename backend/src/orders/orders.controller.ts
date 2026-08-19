import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import {
  CancelOrderDto,
  GenerateDocumentDto,
  AdminOrderNoteDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders')
  listMine(@CurrentUser() user: AuthUser) {
    return this.ordersService.listMine(user.id);
  }

  @Get('orders/by-number/:number')
  getByNumber(@CurrentUser() user: AuthUser, @Param('number') number: string) {
    return this.ordersService.getByNumber(number, user.id, user.role);
  }

  @Get('orders/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.getOne(id, user.id, user.role);
  }

  @Get('orders/:id/documents')
  listDocuments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.listDocuments(id, user.id, user.role);
  }

  @Post('orders/:id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelByCustomer(id, user.id, dto);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/orders')
  listAdmin(@Query('status') status?: OrderStatus) {
    return this.ordersService.listAdmin(status);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/orders/:id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/orders/:id/note')
  updateNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminOrderNoteDto,
  ) {
    return this.ordersService.updateNote(id, dto.note, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/orders/:id/documents')
  generateDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: GenerateDocumentDto,
  ) {
    return this.ordersService.generateDocument(id, dto, user.id);
  }
}
