import { Module } from '@nestjs/common';
import { SlugService } from '../../common/utils/slug.service';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, SlugService],
  exports: [BrandsService],
})
export class BrandsModule {}
