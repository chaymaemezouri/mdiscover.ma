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
import { ContactMessageStatus, Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  Public,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactStatusDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post()
  submit(@Body() dto: CreateContactDto) {
    return this.contactService.submit(dto);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin(@Query('status') status?: ContactMessageStatus) {
    return this.contactService.listAdmin(status);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/:id')
  getAdmin(@Param('id') id: string) {
    return this.contactService.findOneAdmin(id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/:id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateContactStatusDto,
  ) {
    return this.contactService.markStatus(id, dto.status, user.id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contactService.remove(id, user.id);
  }
}
