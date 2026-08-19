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
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Controller()
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get('brands')
  listPublic() {
    return this.brandsService.findAllPublic();
  }

  @Public()
  @Get('brands/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale: 'fr' | 'en' = 'fr',
  ) {
    return this.brandsService.findBySlug(slug, locale);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/brands')
  listAdmin() {
    return this.brandsService.findAllAdmin();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/brands')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/brands/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Delete('admin/brands/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.brandsService.remove(id, user.id);
  }
}
