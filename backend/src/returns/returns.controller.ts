import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReturnStatus, Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import {
  AddReturnPhotosDto,
  CreateRefundDto,
  CreateReturnDto,
  ReceiveReturnDto,
  ReviewReturnDto,
  UpdateReturnTrackingDto,
} from './dto/returns.dto';
import { ReturnsService } from './returns.service';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReturnDto) {
    return this.returnsService.create(user.id, dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.returnsService.listMine(user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin(@Query('status') status?: ReturnStatus) {
    return this.returnsService.listAdmin(status);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewReturnDto,
  ) {
    return this.returnsService.review(id, user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/receive')
  receive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReceiveReturnDto,
  ) {
    return this.returnsService.receive(id, user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Post('admin/:id/refund')
  createRefund(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.returnsService.createRefund(id, user.id, dto);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.returnsService.getOne(id, user.id, user.role);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.returnsService.cancel(id, user.id);
  }

  @Post(':id/photos')
  addPhotos(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddReturnPhotosDto,
  ) {
    return this.returnsService.addPhotos(id, user.id, dto);
  }

  @Patch(':id/tracking')
  updateTracking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReturnTrackingDto,
  ) {
    return this.returnsService.updateTracking(id, user.id, dto);
  }
}
