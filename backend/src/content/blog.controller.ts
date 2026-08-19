import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Public,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/content.dto';
import { BlogService } from './blog.service';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  listPublished() {
    return this.blogService.listPublished();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin() {
    return this.blogService.listAdmin();
  }

  @Roles(Role.ADMIN)
  @Post('admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBlogPostDto) {
    return this.blogService.create(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogService.update(id, user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.blogService.remove(id, user.id);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.getBySlug(slug);
  }
}
