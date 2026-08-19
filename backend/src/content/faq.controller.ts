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
import { Locale, Role } from '@prisma/client';
import {
  CurrentUser,
  Public,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CreateFaqDto, UpdateFaqDto } from './dto/content.dto';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Public()
  @Get()
  listPublic(
    @Query('locale') locale?: Locale,
    @Query('category') category?: string,
  ) {
    return this.faqService.listPublic(locale, category);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin() {
    return this.faqService.listAdmin();
  }

  @Roles(Role.ADMIN)
  @Post('admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFaqDto) {
    return this.faqService.create(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqService.update(id, user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.faqService.remove(id, user.id);
  }
}
