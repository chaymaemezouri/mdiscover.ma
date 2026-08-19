import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser, Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import {
  CreateAddressDto,
  ReviewProfessionalDto,
  UpdateAdminUserDto,
  UpdateIndividualProfileDto,
  UpdateProfessionalProfileDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('users/me/individual')
  updateIndividual(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateIndividualProfileDto,
  ) {
    return this.usersService.updateIndividualProfile(user.id, dto);
  }

  @Patch('users/me/professional')
  updateProfessional(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfessionalProfileDto,
  ) {
    return this.usersService.updateProfessionalProfile(user.id, dto);
  }

  @Get('users/me/addresses')
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.listAddresses(user.id);
  }

  @Post('users/me/addresses')
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(user.id, dto);
  }

  @Delete('users/me/addresses/:id')
  deleteAddress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/users')
  listUsers(@Query('role') role?: Role) {
    return this.usersService.listUsers(role);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/users/professionals/pending')
  listPendingProfessionals() {
    return this.usersService.listPendingProfessionals();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/users/:id')
  getAdmin(@Param('id') id: string) {
    return this.usersService.findOneAdmin(id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/users/:id')
  updateAdmin(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.updateAdmin(admin.id, id, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/users/:id/professional/review')
  reviewProfessional(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewProfessionalDto,
    @Req() req: Request,
  ) {
    return this.usersService.reviewProfessional(admin.id, id, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/users/:id/block')
  blockUser(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.usersService.setBlocked(admin.id, id, true, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/users/:id/unblock')
  unblockUser(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.usersService.setBlocked(admin.id, id, false, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
