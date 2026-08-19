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
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CreateReviewDto, ModerateReviewDto } from './dto/content.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  listForProduct(@Param('productId') productId: string) {
    return this.reviewsService.listForProduct(productId);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.reviewsService.listMine(user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin(@Query('pending') pending?: string) {
    return this.reviewsService.listAdmin(pending === 'true');
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/:id/moderate')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reviewsService.delete(id, user.id, user.role);
  }
}
