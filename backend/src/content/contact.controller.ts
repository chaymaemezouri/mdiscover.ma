import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/auth.decorators';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post()
  submit(@Body() dto: CreateContactDto) {
    return this.contactService.submit(dto);
  }
}
