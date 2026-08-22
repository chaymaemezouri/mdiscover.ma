import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactMessageStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
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

    const row = await this.prisma.contactMessage.create({
      data: payload,
    });

    void this.mail.sendAdminContact(payload);

    await this.audit.log({
      action: 'CONTACT_SUBMITTED',
      entity: 'ContactMessage',
      entityId: row.id,
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

  async listAdmin(status?: ContactMessageStatus) {
    return this.prisma.contactMessage.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async findOneAdmin(id: string) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message introuvable');
    return row;
  }

  async markStatus(
    id: string,
    status: ContactMessageStatus,
    adminId: string,
  ) {
    await this.findOneAdmin(id);
    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: {
        status,
        readAt:
          status === ContactMessageStatus.NEW
            ? null
            : new Date(),
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'CONTACT_STATUS_UPDATED',
      entity: 'ContactMessage',
      entityId: id,
      metadata: { status },
    });
    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.findOneAdmin(id);
    await this.prisma.contactMessage.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: 'CONTACT_DELETED',
      entity: 'ContactMessage',
      entityId: id,
    });
    return { ok: true };
  }
}
