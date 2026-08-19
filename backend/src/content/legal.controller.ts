import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { LegalPageType, Locale, Role } from '@prisma/client';
import {
  CurrentUser,
  Public,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { UpsertLegalPageDto } from './dto/content.dto';
import { LegalService } from './legal.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Public()
  @Get()
  listPublic(@Query('locale') locale?: Locale) {
    return this.legalService.listPublic(locale);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin() {
    return this.legalService.listAdmin();
  }

  @Roles(Role.ADMIN)
  @Put('admin')
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertLegalPageDto) {
    return this.legalService.upsert(user.id, dto);
  }

  @Public()
  @Get('type/:type')
  getByType(
    @Param('type') type: LegalPageType,
    @Query('locale') locale?: Locale,
  ) {
    return this.legalService.getByType(type, locale ?? Locale.FR);
  }

  @Public()
  @Get('slug/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale?: Locale,
  ) {
    return this.legalService.getBySlug(slug, locale ?? Locale.FR);
  }
}
