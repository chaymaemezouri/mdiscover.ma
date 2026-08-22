import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  adminAlertEmail,
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

export type ContactMailPayload = {
  topic: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  message: string;
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
    const host = this.config.get<string>('MAIL_HOST')?.trim();
    const portRaw = this.config.get<string>('MAIL_PORT')?.trim();
    const port = portRaw ? Number(portRaw) : host ? 465 : undefined;
    const secureEnv = this.config.get<string>('MAIL_SECURE')?.trim();
    const secure =
      secureEnv === 'true' ||
      secureEnv === '1' ||
      (secureEnv == null && (port === 465 || port == null));

    this.from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      (user ? `MDiscover <${user}>` : 'MDiscover <noreply@mdiscover.ma>');

    this.enabled = Boolean(user && pass);
    if (!this.enabled) {
      this.logger.warn(
        'Mail désactivé : définissez MAIL_USER et MAIL_PASS (SMTP hébergeur ou Gmail).',
      );
      return;
    }

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 465,
        secure: secure ?? true,
        auth: { user, pass },
      });
      this.logger.log(`Mail SMTP configuré → ${host}:${port ?? 465}`);
    } else {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.logger.log('Mail configuré via Gmail');
    }
  }

  private brand(): BrandVars {
    const siteUrl = (
      this.config.get<string>('FRONTEND_URL') || 'https://mdiscover.ma'
    ).replace(/\/$/, '');
    return {
      brandName: 'MDiscover',
      logoUrl: `${siteUrl}/logo-login.png`,
      siteUrl,
      supportEmail: this.inboxContact(),
      year: new Date().getFullYear(),
    };
  }

  /** Formulaire contact général + support client */
  private inboxContact() {
    return (
      this.config.get<string>('MAIL_CONTACT')?.trim() ||
      this.config.get<string>('MAIL_SUPPORT')?.trim() ||
      this.config.get<string>('MAIL_USER')?.trim() ||
      'contact@mdiscover.ma'
    );
  }

  /** Devis / sourcing / export B2B */
  private inboxVentes() {
    return (
      this.config.get<string>('MAIL_VENTES')?.trim() ||
      this.inboxContact()
    );
  }

  /** Commandes / sales */
  private inboxSales() {
    return (
      this.config.get<string>('MAIL_SALES')?.trim() ||
      this.inboxVentes()
    );
  }

  /** Oriente le message contact selon le sujet du formulaire */
  private inboxForContactTopic(topic: string) {
    const t = topic.trim().toLowerCase();
    if (
      t.includes('devis') ||
      t.includes('sourcing') ||
      t.includes('export')
    ) {
      return this.inboxVentes();
    }
    if (t.includes('commande')) {
      return this.inboxSales();
    }
    return this.inboxContact();
  }

  private async send(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
  }) {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`Mail skip (${opts.subject}) → ${opts.to}`);
      return { skipped: true as const };
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        replyTo: opts.replyTo,
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

  async sendAdminContact(payload: ContactMailPayload) {
    const brand = this.brand();
    const to = this.inboxForContactTopic(payload.topic);
    const content = adminAlertEmail({
      ...brand,
      subject: `Contact · ${payload.topic}`,
      title: 'Nouveau message contact',
      preheader: `${payload.name} — ${payload.topic}`,
      rows: [
        { label: 'Sujet', value: payload.topic },
        { label: 'Nom', value: payload.name },
        { label: 'Email', value: payload.email },
        ...(payload.company?.trim()
          ? [{ label: 'Entreprise', value: payload.company.trim() }]
          : []),
        ...(payload.phone?.trim()
          ? [{ label: 'Téléphone', value: payload.phone.trim() }]
          : []),
      ],
      message: payload.message,
      ctaLabel: 'Voir dans l’admin',
      ctaUrl: `${brand.siteUrl}/admin/contact`,
    });
    return this.send({
      to,
      replyTo: payload.email,
      ...content,
    });
  }

  async sendAdminNewQuote(opts: {
    quoteId: string;
    quoteNumber: string;
    contactName?: string | null;
    contactEmail?: string | null;
    companyName?: string | null;
    itemCount: number;
    message?: string | null;
  }) {
    const brand = this.brand();
    const content = adminAlertEmail({
      ...brand,
      subject: `Nouveau devis · ${opts.quoteNumber}`,
      title: 'Nouveau devis à traiter',
      preheader: `Devis ${opts.quoteNumber}`,
      rows: [
        { label: 'N° devis', value: opts.quoteNumber },
        {
          label: 'Contact',
          value: opts.contactName?.trim() || '—',
        },
        {
          label: 'Email',
          value: opts.contactEmail?.trim() || '—',
        },
        ...(opts.companyName?.trim()
          ? [{ label: 'Entreprise', value: opts.companyName.trim() }]
          : []),
        { label: 'Lignes', value: String(opts.itemCount) },
      ],
      message: opts.message,
      ctaLabel: 'Voir le devis',
      ctaUrl: `${brand.siteUrl}/admin/devis/${opts.quoteId}`,
    });
    return this.send({
      to: this.inboxVentes(),
      replyTo: opts.contactEmail?.trim() || undefined,
      ...content,
    });
  }

  async sendAdminNewOrder(opts: {
    orderId: string;
    orderNumber: string;
    customerName?: string | null;
    customerEmail?: string | null;
    total: number;
    currency: string;
    paymentMethod?: string | null;
    status: string;
  }) {
    const brand = this.brand();
    const totalLabel = `${opts.total.toFixed(2)} ${opts.currency}`;
    const content = adminAlertEmail({
      ...brand,
      subject: `Nouvelle commande · ${opts.orderNumber}`,
      title: 'Nouvelle commande reçue',
      preheader: `${opts.orderNumber} · ${totalLabel}`,
      rows: [
        { label: 'N° commande', value: opts.orderNumber },
        { label: 'Client', value: opts.customerName?.trim() || '—' },
        { label: 'Email', value: opts.customerEmail?.trim() || '—' },
        { label: 'Total', value: totalLabel },
        { label: 'Paiement', value: opts.paymentMethod || '—' },
        { label: 'Statut', value: opts.status },
      ],
      ctaLabel: 'Voir la commande',
      ctaUrl: `${brand.siteUrl}/admin/commandes/${opts.orderId}`,
    });
    return this.send({
      to: this.inboxSales(),
      replyTo: opts.customerEmail?.trim() || undefined,
      ...content,
    });
  }
}
