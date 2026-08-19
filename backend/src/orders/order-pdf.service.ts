import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderDocumentType, OrderStatus } from '@prisma/client';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';

type OrderPdfInput = {
  number: string;
  status: OrderStatus;
  createdAt: Date;
  currency: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  deliveryMode: string;
  carrierName?: string | null;
  trackingNumber?: string | null;
  shippingAddress: Record<string, unknown>;
  items: Array<{
    sku: string;
    nameFr: string;
    nameEn: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

@Injectable()
export class OrderPdfService {
  constructor(private readonly config: ConfigService) {}

  async generate(
    order: OrderPdfInput,
    type: OrderDocumentType,
    locale: 'FR' | 'EN' = 'FR',
  ): Promise<string> {
    const uploadDir = this.config.get<string>('UPLOAD_DIR', 'uploads');
    const dir = join(process.cwd(), uploadDir, 'orders');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const suffix = type.toLowerCase();
    const fileName = `${order.number}_${suffix}_${locale.toLowerCase()}.pdf`;
    const filePath = join(dir, fileName);
    const publicUrl = `/${uploadDir}/orders/${fileName}`;

    const labels = this.labels(type, locale);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(18).text('Mdiscover Impex Food');
      doc.fontSize(14).text(labels.title);
      doc.moveDown();
      doc.fontSize(10).fillColor('#333');
      doc.text(`${labels.orderNo} : ${order.number}`);
      doc.text(`${labels.date} : ${order.createdAt.toISOString().slice(0, 10)}`);
      doc.text(`${labels.status} : ${order.status}`);
      doc.text(`${labels.payment} : ${order.paymentMethod}`);
      doc.text(`${labels.delivery} : ${order.deliveryMode}`);
      if (order.carrierName) {
        doc.text(`${labels.carrier} : ${order.carrierName}`);
      }
      if (order.trackingNumber) {
        doc.text(`${labels.tracking} : ${order.trackingNumber}`);
      }
      doc.moveDown();

      const addr = order.shippingAddress;
      doc.text(labels.shipTo, { underline: true });
      doc.text(String(addr.line1 ?? ''));
      if (addr.line2) doc.text(String(addr.line2));
      doc.text(
        [addr.postalCode, addr.city, addr.region, addr.country]
          .filter(Boolean)
          .join(' '),
      );
      doc.moveDown();

      doc.fillColor('#000').text(labels.items, { underline: true });
      doc.moveDown(0.4);

      for (const item of order.items) {
        const name = locale === 'EN' ? item.nameEn : item.nameFr;
        doc
          .fontSize(10)
          .text(
            `${item.sku} — ${name} | x${item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.lineTotal.toFixed(2)} ${order.currency}`,
          );
      }

      doc.moveDown();
      if (type !== OrderDocumentType.DELIVERY_NOTE) {
        doc.text(
          `${labels.subtotal} : ${order.subtotal.toFixed(2)} ${order.currency}`,
        );
        doc.text(
          `${labels.discount} : ${order.discount.toFixed(2)} ${order.currency}`,
        );
        doc.text(
          `${labels.tax} (${order.taxRate}%) : ${order.taxAmount.toFixed(2)} ${order.currency}`,
        );
        if (order.shippingFee > 0) {
          doc.text(
            `${labels.shipping} : ${order.shippingFee.toFixed(2)} ${order.currency}`,
          );
        }
        doc
          .fontSize(12)
          .text(`${labels.total} : ${order.total.toFixed(2)} ${order.currency}`, {
            underline: true,
          });
      } else {
        doc.text(labels.deliveryNoteHint);
      }

      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#666')
        .text('Mdiscover Impex Food — document généré automatiquement');

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return publicUrl;
  }

  private labels(type: OrderDocumentType, locale: 'FR' | 'EN') {
    const frTitles: Record<OrderDocumentType, string> = {
      INVOICE: 'Facture',
      DELIVERY_NOTE: 'Bon de livraison',
      PROFORMA: 'Facture pro forma',
      RECEIPT: 'Reçu de paiement',
      CREDIT_NOTE: 'Avoir',
      PURCHASE_ORDER: 'Bon de commande',
    };
    const enTitles: Record<OrderDocumentType, string> = {
      INVOICE: 'Invoice',
      DELIVERY_NOTE: 'Delivery note',
      PROFORMA: 'Proforma invoice',
      RECEIPT: 'Payment receipt',
      CREDIT_NOTE: 'Credit note',
      PURCHASE_ORDER: 'Purchase order',
    };

    if (locale === 'EN') {
      return {
        title: enTitles[type],
        orderNo: 'Order',
        date: 'Date',
        status: 'Status',
        payment: 'Payment',
        delivery: 'Delivery mode',
        carrier: 'Carrier',
        tracking: 'Tracking',
        shipTo: 'Ship to',
        items: 'Items',
        subtotal: 'Subtotal',
        discount: 'Discount',
        tax: 'VAT',
        shipping: 'Shipping',
        total: 'Total',
        deliveryNoteHint: 'Quantities for warehouse / carrier use.',
      };
    }

    return {
      title: frTitles[type],
      orderNo: 'Commande',
      date: 'Date',
      status: 'Statut',
      payment: 'Paiement',
      delivery: 'Mode de livraison',
      carrier: 'Transporteur',
      tracking: 'Suivi',
      shipTo: 'Livraison à',
      items: 'Articles',
      subtotal: 'Sous-total',
      discount: 'Remise',
      tax: 'TVA',
      shipping: 'Livraison',
      total: 'Total',
      deliveryNoteHint: 'Quantités destinées à l’entrepôt / transporteur.',
    };
  }
}
