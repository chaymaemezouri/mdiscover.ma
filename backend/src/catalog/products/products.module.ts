import { Module } from '@nestjs/common';
import { SlugService } from '../../common/utils/slug.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, SlugService],
  exports: [ProductsService],
})
export class ProductsModule {}
