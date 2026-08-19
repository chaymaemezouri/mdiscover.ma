import { Module } from '@nestjs/common';
import { ShippingModule } from '../shipping/shipping.module';
import { CartAdminService } from './cart-admin.service';
import { CartPricingService } from './cart-pricing.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [ShippingModule],
  controllers: [CartController],
  providers: [
    CartService,
    CheckoutService,
    CartPricingService,
    CartAdminService,
  ],
  exports: [CartService, CheckoutService, CartPricingService],
})
export class CartModule {}
