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
import { BannerPlacement, Role } from '@prisma/client';
import {
  CurrentUser,
  Public,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CreateBannerDto, UpdateBannerDto } from './dto/content.dto';
import { BannersService } from './banners.service';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Public()
  @Get()
  listPublic(@Query('placement') placement?: BannerPlacement) {
    return this.bannersService.listPublic(placement);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin() {
    return this.bannersService.listAdmin();
  }

  @Roles(Role.ADMIN)
  @Post('admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBannerDto) {
    return this.bannersService.create(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.bannersService.update(id, user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bannersService.remove(id, user.id);
  }
}
