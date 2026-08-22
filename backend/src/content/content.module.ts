import { Module } from '@nestjs/common';
import { SlugService } from '../common/utils/slug.service';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { StockAlertsController } from './stock-alerts.controller';
import { StockAlertsService } from './stock-alerts.service';

@Module({
  controllers: [
    ReviewsController,
    FavoritesController,
    StockAlertsController,
    BlogController,
    FaqController,
    LegalController,
    BannersController,
    ContactController,
  ],
  providers: [
    SlugService,
    ReviewsService,
    FavoritesService,
    StockAlertsService,
    BlogService,
    FaqService,
    LegalService,
    BannersService,
    ContactService,
  ],
})
export class ContentModule {}
