import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CartAdminService } from './cart-admin.service';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import {
  CreatePromoCodeDto,
  CreateShippingRateDto,
  UpdatePromoCodeDto,
} from './dto/admin-cart.dto';
import {
  AddCartItemDto,
  ApplyPromoDto,
  CheckoutDto,
  EstimateShippingDto,
  UpdateCartItemDto,
} from './dto/cart.dto';

@Controller()
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly checkoutService: CheckoutService,
    private readonly cartAdminService: CartAdminService,
  ) {}

  @Get('cart')
  getCart(@CurrentUser() user: AuthUser, @Query() estimate: EstimateShippingDto) {
    return this.cartService.getCartView(user.id, estimate);
  }

  @Post('cart/items')
  addItem(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('cart/items/:itemId')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete('cart/items/:itemId')
  removeItem(@CurrentUser() user: AuthUser, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete('cart')
  clear(@CurrentUser() user: AuthUser) {
    return this.cartService.clear(user.id);
  }

  @Post('cart/promo')
  applyPromo(@CurrentUser() user: AuthUser, @Body() dto: ApplyPromoDto) {
    return this.cartService.applyPromo(user.id, dto);
  }

  @Delete('cart/promo')
  removePromo(@CurrentUser() user: AuthUser) {
    return this.cartService.removePromo(user.id);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(user.id, dto);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/promos')
  listPromos() {
    return this.cartAdminService.listPromos();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/promos')
  createPromo(@CurrentUser() user: AuthUser, @Body() dto: CreatePromoCodeDto) {
    return this.cartAdminService.createPromo(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/promos/:id')
  updatePromo(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    return this.cartAdminService.updatePromo(id, dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/shipping-rates')
  listShippingRates() {
    return this.cartAdminService.listShippingRates();
  }

  @Roles(Role.ADMIN)
  @Post('admin/shipping-rates')
  createShippingRate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShippingRateDto,
  ) {
    return this.cartAdminService.createShippingRate(dto, user.id);
  }
}
