import { Module } from '@nestjs/common';
import { SlugService } from '../../common/utils/slug.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, SlugService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
