import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  orderConfirmedEmail,
  orderDeliveredEmail,
  orderPreparingEmail,
  orderShippingEmail,
  welcomeEmail,
  type BrandVars,
} from './mail.templates';

export type OrderMailContext = {
  email: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  trackingNumber?: string | null;
  carrierName?: string | null;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly enabled: boolean;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('MAIL_USER')?.trim();
    const pass = this.config.get<string>('MAIL_PASS')?.trim();
    this.from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      (user ? `MDiscover <${user}>` : 'MDiscover <noreply@mdiscover.ma>');

    this.enabled = Boolean(user && pass);
    if (!this.enabled) {
      this.logger.warn(
        'Mail désactivé : définissez MAIL_USER et MAIL_PASS (mot de passe d’application Gmail).',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  private brand(): BrandVars {
    const siteUrl = (
      this.config.get<string>('FRONTEND_URL') || 'https://mdiscover.ma'
    ).replace(/\/$/, '');
    return {
      brandName: 'MDiscover',
      logoUrl: `${siteUrl}/logo-login.png`,
      siteUrl,
      supportEmail:
        this.config.get<string>('MAIL_SUPPORT')?.trim() ||
        'contact@mdiscover.ma',
      year: new Date().getFullYear(),
    };
  }

  private async send(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`Mail skip (${opts.subject}) → ${opts.to}`);
      return { skipped: true as const };
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      this.logger.log(`Mail envoyé : ${opts.subject} → ${opts.to}`);
      return { skipped: false as const };
    } catch (err) {
      this.logger.error(
        `Échec envoi mail (${opts.subject}) → ${opts.to}`,
        err instanceof Error ? err.stack : String(err),
      );
      return { skipped: false as const, error: true as const };
    }
  }

  async sendWelcome(to: string, customerName: string) {
    const content = welcomeEmail({
      ...this.brand(),
      customerName: customerName.trim() || 'Client',
    });
    return this.send({ to, ...content });
  }

  async sendOrderStatus(status: OrderStatus, ctx: OrderMailContext) {
    const brand = this.brand();
    const base = {
      ...brand,
      customerName: ctx.customerName.trim() || 'Client',
      orderNumber: ctx.orderNumber,
      orderUrl: `${brand.siteUrl}/compte/commandes/${ctx.orderId}`,
      trackingNumber: ctx.trackingNumber,
      carrierName: ctx.carrierName,
    };

    let content:
      | ReturnType<typeof orderConfirmedEmail>
      | ReturnType<typeof orderPreparingEmail>
      | ReturnType<typeof orderShippingEmail>
      | ReturnType<typeof orderDeliveredEmail>
      | null = null;

    switch (status) {
      case OrderStatus.CONFIRMED:
        content = orderConfirmedEmail(base);
        break;
      case OrderStatus.PREPARING:
        content = orderPreparingEmail(base);
        break;
      case OrderStatus.SHIPPED:
      case OrderStatus.OUT_FOR_DELIVERY:
        content = orderShippingEmail(base);
        break;
      case OrderStatus.DELIVERED:
        content = orderDeliveredEmail(base);
        break;
      default:
        return { skipped: true as const };
    }

    return this.send({ to: ctx.email, ...content });
  }
}
