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
  Public,
  Roles,
} from '../../common/decorators/auth.decorators';
import type { AuthUser } from '../../common/decorators/auth.decorators';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get('categories')
  listPublic() {
    return this.categoriesService.findAllPublic();
  }

  @Public()
  @Get('categories/spotlight')
  listSpotlight() {
    return this.categoriesService.findHomeSpotlight();
  }

  @Public()
  @Get('categories/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale: 'fr' | 'en' = 'fr',
  ) {
    return this.categoriesService.findBySlug(slug, locale);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/categories')
  listAdmin() {
    return this.categoriesService.findAllAdmin();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/categories/:id')
  getAdmin(@Param('id') id: string) {
    return this.categoriesService.findOneAdmin(id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/categories')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/categories/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Delete('admin/categories/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.remove(id, user.id);
  }
}
