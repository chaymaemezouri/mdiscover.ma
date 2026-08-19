import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

type PdfDoc = InstanceType<typeof PDFDocument>;

type QuotePdfInput = {
  number: string;
  createdAt: Date;
  validityDate: Date | null;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  companyAddress: string | null;
  ice: string | null;
  taxId: string | null;
  destinationCountry: string;
  conditions: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  shippingFee: number;
  total: number;
  items: Array<{
    sku: string;
    nameFr: string;
    packaging: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_H = 48;

const NAVY = '#0E2A47';
const GREEN = '#4E7A63';
const MUTED = '#5B6B7C';
const LINE = '#D5DEE7';
const SOFT = '#F3F6F9';
const TEXT = '#1A2B3C';

const DEFAULT_COMPANY = {
  legalName: 'MDISCOVER IMPEX FOOD',
  tagline: 'Import · Export · Agroalimentaire',
  address: 'Hay Khat Ramla 01, Av. Idriss 01, Laâyoune, Maroc',
  phone: '+212 661-52-86-08',
  email: 'contact@mdiscover.ma',
  web: 'www.mdiscover.ma',
};

type CompanyInfo = typeof DEFAULT_COMPANY;

const COUNTRY_FR: Record<string, string> = {
  MA: 'Maroc',
  FR: 'France',
  ES: 'Espagne',
  PT: 'Portugal',
  BE: 'Belgique',
  NL: 'Pays-Bas',
  DE: 'Allemagne',
  IT: 'Italie',
  GB: 'Royaume-Uni',
  UK: 'Royaume-Uni',
  SN: 'Sénégal',
  CI: "Cote d'Ivoire",
  AE: 'Emirats arabes unis',
  SA: 'Arabie saoudite',
  QA: 'Qatar',
  KW: 'Koweit',
  TN: 'Tunisie',
  DZ: 'Algerie',
  MR: 'Mauritanie',
  US: 'Etats-Unis',
  CA: 'Canada',
};

@Injectable()
export class QuotePdfService {
  private company: CompanyInfo = { ...DEFAULT_COMPANY };

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generate(quote: QuotePdfInput): Promise<string> {
    this.company = await this.loadCompany();
    const uploadDir = this.config.get<string>('UPLOAD_DIR', 'uploads');
    const dir = join(process.cwd(), uploadDir, 'quotes');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const fileName = `${quote.number}.pdf`;
    const filePath = join(dir, fileName);
    const publicUrl = `/${uploadDir}/quotes/${fileName}`;
    const logoPath = this.resolveLogoPath();

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: true,
        info: {
          Title: `Devis ${quote.number}`,
          Author: this.company.legalName,
          Subject: 'Offre commerciale',
        },
      });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      this.drawTopBars(doc);
      let y = this.drawHeader(doc, quote, logoPath);

      y = this.drawMetaCards(doc, quote, y + 18);
      y = this.drawItemsTable(doc, quote, y + 18);
      y = this.drawTotals(doc, quote, y + 14);
      this.drawConditions(doc, quote, y + 16);

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        this.drawFooter(doc, i + 1, range.count);
      }

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return publicUrl;
  }

  private resolveLogoPath(): string | null {
    const candidates = [
      join(__dirname, '..', 'assets', 'brand', 'logo-clean.png'),
      join(process.cwd(), 'dist', 'assets', 'brand', 'logo-clean.png'),
      join(process.cwd(), 'src', 'assets', 'brand', 'logo-clean.png'),
      join(process.cwd(), '..', 'frontend', 'public', 'logo-clean.png'),
    ];
    return candidates.find((path) => existsSync(path)) ?? null;
  }

  private drawTopBars(doc: PdfDoc) {
    doc.rect(0, 0, PAGE_W, 8).fill(NAVY);
    doc.rect(0, 8, PAGE_W, 4).fill(GREEN);
  }

  private drawHeader(
    doc: PdfDoc,
    quote: QuotePdfInput,
    logoPath: string | null,
  ): number {
    const top = 24;
    const logoH = 36;
    const logoW = 200;

    if (logoPath) {
      try {
        doc.image(logoPath, M, top, { fit: [logoW, logoH] });
      } catch {
        this.drawLogoFallback(doc, top);
      }
    } else {
      this.drawLogoFallback(doc, top);
    }

    const infoY = top + logoH + 8;
    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(this.company.legalName, M, infoY, { width: 280 });
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(this.company.tagline, M, infoY + 12, { width: 280 });
    doc.text(this.company.address, M, infoY + 24, { width: 280 });
    doc.text(
      `${this.company.phone}  ·  ${this.company.email}`,
      M,
      infoY + 36,
      { width: 280 },
    );

    const boxW = 196;
    const boxX = PAGE_W - M - boxW;
    const boxH = 104;
    doc.roundedRect(boxX, top, boxW, boxH, 4).fill(NAVY);
    doc.rect(boxX, top, 5, boxH).fill(GREEN);

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('DEVIS', boxX + 16, top + 10, { width: boxW - 24, lineBreak: false });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#C5D4C8')
      .text(quote.number, boxX + 16, top + 32, {
        width: boxW - 24,
        lineBreak: false,
      });
    doc
      .moveTo(boxX + 16, top + 50)
      .lineTo(boxX + boxW - 14, top + 50)
      .strokeColor('#3A5A4A')
      .lineWidth(0.6)
      .stroke();
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica')
      .fontSize(8)
      .text(`Date : ${this.formatDate(quote.createdAt)}`, boxX + 16, top + 58, {
        width: boxW - 24,
        lineBreak: false,
      });
    doc.text(
      `Validité : ${quote.validityDate ? this.formatDate(quote.validityDate) : '-'}`,
      boxX + 16,
      top + 76,
      { width: boxW - 24, lineBreak: false },
    );

    return Math.max(infoY + 52, top + boxH);
  }

  private drawLogoFallback(doc: PdfDoc, top: number) {
    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('DISCOVER', M, top + 8, { width: 220 });
  }

  private drawMetaCards(doc: PdfDoc, quote: QuotePdfInput, y: number): number {
    const gap = 14;
    const cardW = (CONTENT_W - gap) / 2;
    const left = this.clientLines(quote);
    const right: Array<[string, string]> = [
      ['N. devis', quote.number],
      ["Date d'émission", this.formatDate(quote.createdAt)],
      [
        "Valable jusqu'au",
        quote.validityDate ? this.formatDate(quote.validityDate) : '-',
      ],
      ['Destination', this.countryLabel(quote.destinationCountry)],
      ['Devise', quote.currency],
    ];

    const valueW = cardW - 100;
    const leftH = this.cardHeight(left, valueW);
    const rightH = this.cardHeight(right, valueW);
    const h = Math.max(leftH, rightH);

    this.paintCard(doc, M, y, cardW, h, 'Destinataire', left);
    this.paintCard(doc, M + cardW + gap, y, cardW, h, 'Détails du devis', right);
    return y + h;
  }

  private clientLines(quote: QuotePdfInput): Array<[string, string]> {
    const lines: Array<[string, string]> = [];
    const client = quote.companyName || quote.contactName || '-';
    lines.push(['Client', client]);
    if (quote.companyName && quote.contactName) {
      lines.push(['Contact', quote.contactName]);
    }
    if (quote.contactEmail) lines.push(['Email', quote.contactEmail]);
    if (quote.contactPhone) lines.push(['Tél.', quote.contactPhone]);
    if (quote.companyAddress) lines.push(['Adresse', quote.companyAddress]);
    if (quote.ice) lines.push(['ICE', quote.ice]);
    if (quote.taxId) lines.push(['Identifiant fiscal', quote.taxId]);
    return lines;
  }

  private cardHeight(rows: Array<[string, string]>, valueW: number): number {
    let h = 28 + 12;
    for (const [, value] of rows) {
      const lines = Math.max(1, Math.ceil(value.length / Math.max(18, valueW / 4.4)));
      h += Math.max(16, lines * 11);
    }
    return h;
  }

  private paintCard(
    doc: PdfDoc,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    rows: Array<[string, string]>,
  ) {
    doc.roundedRect(x, y, w, h, 3).fill(SOFT);
    doc.roundedRect(x, y, w, h, 3).strokeColor(LINE).lineWidth(0.8).stroke();
    doc.rect(x, y, 4, h).fill(GREEN);

    doc
      .fillColor(GREEN)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(title.toUpperCase(), x + 14, y + 10, { width: w - 22 });

    let rowY = y + 28;
    const valueW = w - 100;
    for (const [label, value] of rows) {
      const h = Math.max(
        16,
        doc.heightOfString(value, { width: valueW, lineGap: 1 }) + 4,
      );
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(7.5)
        .text(label, x + 14, rowY, { width: 70 });
      doc
        .fillColor(TEXT)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(value, x + 86, rowY, { width: valueW, lineGap: 1 });
      rowY += h;
    }
  }

  private drawItemsTable(doc: PdfDoc, quote: QuotePdfInput, y: number): number {
    const cols = this.tableColumns();
    y = this.ensureSpace(doc, y, 48, quote.number);
    y = this.drawTableHeader(doc, y, cols);

    quote.items.forEach((item, index) => {
      const nameH = doc.heightOfString(item.nameFr, {
        width: cols[1].w - 10,
        lineGap: 1,
      });
      const packH = item.packaging ? 10 : 0;
      const rowH = Math.max(26, nameH + packH + 12);
      y = this.ensureSpace(doc, y, rowH + 4, quote.number);
      if (y < 90) {
        y = this.drawTableHeader(doc, y, cols);
      }

      if (index % 2 === 0) {
        doc.rect(M, y, CONTENT_W, rowH).fill('#FAFCFD');
      }
      doc
        .moveTo(M, y + rowH)
        .lineTo(M + CONTENT_W, y + rowH)
        .strokeColor(LINE)
        .lineWidth(0.4)
        .stroke();

      const mid = y + 8;
      doc.fillColor(TEXT).font('Helvetica').fontSize(8);
      doc.text(item.sku, cols[0].x + 6, mid, { width: cols[0].w - 10 });
      doc.text(item.nameFr, cols[1].x + 6, mid, {
        width: cols[1].w - 10,
        lineGap: 1,
      });
      if (item.packaging) {
        doc
          .fillColor(MUTED)
          .fontSize(7)
          .text(item.packaging, cols[1].x + 6, mid + nameH + 1, {
            width: cols[1].w - 10,
          });
      }
      doc.fillColor(TEXT).font('Helvetica').fontSize(8);
      doc.text(String(item.quantity), cols[2].x, mid, {
        width: cols[2].w - 8,
        align: 'right',
      });
      doc.text(this.money(item.unitPrice, quote.currency), cols[3].x, mid, {
        width: cols[3].w - 8,
        align: 'right',
      });
      doc
        .font('Helvetica-Bold')
        .text(this.money(item.lineTotal, quote.currency), cols[4].x, mid, {
          width: cols[4].w - 8,
          align: 'right',
        });
      y += rowH;
    });

    doc
      .rect(M, y - 0.5, CONTENT_W, 0.8)
      .fill(NAVY)
      .stroke();
    return y;
  }

  private tableColumns() {
    const widths = [78, 215, 42, 90, 90];
    let x = M;
    const labels = ['Réf.', 'Désignation', 'Qté', 'P.U. HT', 'Total HT'];
    return widths.map((w, i) => {
      const col = { x, w, label: labels[i] };
      x += w;
      return col;
    });
  }

  private drawTableHeader(
    doc: PdfDoc,
    y: number,
    cols: Array<{ x: number; w: number; label: string }>,
  ): number {
    const h = 24;
    doc.rect(M, y, CONTENT_W, h).fill(NAVY);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    cols.forEach((col, i) => {
      doc.text(col.label.toUpperCase(), col.x + (i >= 2 ? 0 : 6), y + 8, {
        width: col.w - (i >= 2 ? 8 : 10),
        align: i >= 2 ? 'right' : 'left',
      });
    });
    return y + h;
  }

  private drawTotals(doc: PdfDoc, quote: QuotePdfInput, y: number): number {
    const boxW = 230;
    const rows: Array<{ label: string; value: string; strong?: boolean }> = [
      { label: 'Sous-total HT', value: this.money(quote.subtotal, quote.currency) },
      { label: 'Remise', value: this.money(quote.discount, quote.currency) },
      {
        label: `TVA (${this.formatNumber(quote.taxRate)} %)`,
        value: this.money(quote.taxAmount, quote.currency),
      },
      { label: 'Livraison', value: this.money(quote.shippingFee, quote.currency) },
      {
        label: 'Total TTC',
        value: this.money(quote.total, quote.currency),
        strong: true,
      },
    ];
    const boxH = 18 + 18 * (rows.length - 1) + 30;
    y = this.ensureSpace(doc, y, boxH + 8, quote.number);
    const x = PAGE_W - M - boxW;

    doc.roundedRect(x, y, boxW, boxH, 3).fill(SOFT);
    doc.roundedRect(x, y, boxW, boxH, 3).strokeColor(LINE).lineWidth(0.8).stroke();

    let rowY = y + 12;
    for (const row of rows) {
      if (row.strong) {
        doc.rect(x, rowY - 6, boxW, 26).fill(GREEN);
        doc
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(row.label, x + 14, rowY, { width: 90 });
        doc.text(row.value, x + 100, rowY, {
          width: boxW - 114,
          align: 'right',
        });
      } else {
        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(8)
          .text(row.label, x + 14, rowY, { width: 100 });
        doc
          .fillColor(TEXT)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(row.value, x + 110, rowY, {
            width: boxW - 124,
            align: 'right',
          });
      }
      rowY += row.strong ? 22 : 18;
    }

    return y + boxH;
  }

  private drawConditions(doc: PdfDoc, quote: QuotePdfInput, y: number) {
    const text =
      quote.conditions?.trim() ||
      `Prix exprimés en ${quote.currency}. Offre valable jusqu'à la date indiquée, sous réserve de disponibilité. Conditions de paiement et délais de livraison à convenir à la commande.`;

    const h = 36 + doc.heightOfString(text, { width: CONTENT_W - 24, lineGap: 2 });
    y = this.ensureSpace(doc, y, Math.min(h, 120), quote.number);

    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Conditions commerciales', M, y);
    doc
      .moveTo(M, y + 14)
      .lineTo(M + 132, y + 14)
      .strokeColor(GREEN)
      .lineWidth(1.4)
      .stroke();
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(text, M, y + 22, {
        width: CONTENT_W,
        lineGap: 2,
        align: 'left',
      });
  }

  private drawFooter(doc: PdfDoc, page: number, total: number) {
    const y = PAGE_H - FOOTER_H;
    doc.rect(0, y, PAGE_W, FOOTER_H).fill(NAVY);
    doc.rect(0, y, PAGE_W, 3).fill(GREEN);
    doc
      .fillColor('#D7E3DA')
      .font('Helvetica')
      .fontSize(7)
      .text(
        `${this.company.legalName}  ·  ${this.company.address}`,
        M,
        y + 12,
        { width: CONTENT_W - 80 },
      );
    doc.text(
      `${this.company.phone}  ·  ${this.company.email}  ·  ${this.company.web}`,
      M,
      y + 24,
      { width: CONTENT_W - 80 },
    );
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(`${page} / ${total}`, M, y + 18, {
        width: CONTENT_W,
        align: 'right',
      });
  }

  private ensureSpace(
    doc: PdfDoc,
    y: number,
    needed: number,
    quoteNumber: string,
  ): number {
    const limit = PAGE_H - FOOTER_H - 16;
    if (y + needed <= limit) return y;
    doc.addPage({ size: 'A4', margin: 0 });
    this.drawTopBars(doc);
    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Devis ${quoteNumber} - suite`, M, 22, { width: CONTENT_W });
    return 42;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatNumber(n: number): string {
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2,
    }).format(n);
  }

  private money(n: number, currency: string): string {
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)} ${currency}`;
  }

  private countryLabel(code: string): string {
    const key = code.trim().toUpperCase();
    return COUNTRY_FR[key] ? `${COUNTRY_FR[key]} (${key})` : code;
  }

  private async loadCompany(): Promise<CompanyInfo> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'company.' } },
    });
    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const pick = (key: string, fallback: string) =>
      map[key]?.trim() || fallback;
    return {
      legalName: pick('company.legalName', DEFAULT_COMPANY.legalName),
      tagline: pick('company.tagline', DEFAULT_COMPANY.tagline),
      address: pick('company.address', DEFAULT_COMPANY.address),
      phone: pick('company.phone', DEFAULT_COMPANY.phone),
      email: pick('company.email', DEFAULT_COMPANY.email),
      web: pick('company.web', DEFAULT_COMPANY.web),
    };
  }
}
