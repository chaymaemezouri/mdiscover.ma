import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { FavoriteProductDto } from './dto/content.dto';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.favoritesService.list(user.id);
  }

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: FavoriteProductDto) {
    return this.favoritesService.add(user.id, dto.productId);
  }

  @Post('toggle')
  toggle(@CurrentUser() user: AuthUser, @Body() dto: FavoriteProductDto) {
    return this.favoritesService.toggle(user.id, dto.productId);
  }

  @Delete(':productId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.remove(user.id, productId);
  }
}
