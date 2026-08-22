import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { CreateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async submit(dto: CreateContactDto) {
    const payload = {
      topic: dto.topic.trim(),
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      company: dto.company?.trim() || null,
      phone: dto.phone?.trim() || null,
      message: dto.message.trim(),
    };

    await this.mail.sendAdminContact(payload);

    await this.audit.log({
      action: 'CONTACT_SUBMITTED',
      entity: 'Contact',
      metadata: {
        topic: payload.topic,
        email: payload.email,
        name: payload.name,
      },
    });

    return {
      ok: true,
      message: 'Message reçu. Notre équipe vous répondra rapidement.',
    };
  }
}
