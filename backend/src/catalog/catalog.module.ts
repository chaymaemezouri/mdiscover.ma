import { Module } from '@nestjs/common';
import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [CategoriesModule, BrandsModule, ProductsModule, SearchModule],
  exports: [CategoriesModule, BrandsModule, ProductsModule, SearchModule],
})
export class CatalogModule {}
