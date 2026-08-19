import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_SETTINGS: Record<string, string> = {
  'company.legalName': 'MDISCOVER IMPEX FOOD',
  'company.tagline': 'Import · Export · Agroalimentaire',
  'company.address': 'Hay Khat Ramla 01, Av. Idriss 01, Laâyoune, Maroc',
  'company.city': 'Laâyoune',
  'company.phone': '+212 661-52-86-08',
  'company.email': 'contact@mdiscover.ma',
  'company.web': 'www.mdiscover.ma',
  'company.hours': 'Lun–Ven · 9h00–18h00',
  'company.ice': '',
  'company.if': '',
  'company.rc': '',
  'bank.bankName': 'Banque Populaire',
  'bank.iban': 'MA640007XXXXXXXXXXXXXX',
  'bank.rib': '007XXXXXXXXXXXXXX',
  'bank.accountName': 'Mdiscover Impex Food',
  'ops.lowStockThreshold': '10',
  'ops.quoteValidityDays': '15',
};

const PUBLIC_KEYS = [
  'company.legalName',
  'company.tagline',
  'company.address',
  'company.city',
  'company.phone',
  'company.email',
  'company.web',
  'company.hours',
  'company.ice',
] as const;

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    await this.ensureDefaults();
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async asMap() {
    const rows = await this.list();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async get(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  async getValue(key: string, fallback?: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    const value = setting?.value?.trim();
    if (value) return value;
    return fallback ?? DEFAULT_SETTINGS[key] ?? '';
  }

  async publicContact() {
    await this.ensureDefaults();
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [...PUBLIC_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      legalName: map['company.legalName'] || DEFAULT_SETTINGS['company.legalName'],
      tagline: map['company.tagline'] || DEFAULT_SETTINGS['company.tagline'],
      address: map['company.address'] || DEFAULT_SETTINGS['company.address'],
      city: map['company.city'] || DEFAULT_SETTINGS['company.city'],
      phone: map['company.phone'] || DEFAULT_SETTINGS['company.phone'],
      email: map['company.email'] || DEFAULT_SETTINGS['company.email'],
      web: map['company.web'] || DEFAULT_SETTINGS['company.web'],
      hours: map['company.hours'] || DEFAULT_SETTINGS['company.hours'],
      ice: map['company.ice'] || '',
    };
  }

  async upsert(adminId: string, key: string, value: string) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await this.audit.log({
      userId: adminId,
      action: 'SETTING_UPSERTED',
      entity: 'SystemSetting',
      entityId: setting.id,
      metadata: { key },
    });
    return setting;
  }

  async upsertMany(
    adminId: string,
    items: Array<{ key: string; value: string }>,
  ) {
    const saved = [];
    for (const item of items) {
      const key = item.key.trim();
      if (!key) continue;
      saved.push(await this.upsert(adminId, key, item.value ?? ''));
    }
    return { count: saved.length, items: saved };
  }

  async listAudit(params: {
    action?: string;
    entity?: string;
    take?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(params.action ? { action: params.action } : {}),
        ...(params.entity ? { entity: params.entity } : {}),
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.take ?? 100, 500),
    });
  }

  private async ensureDefaults() {
    const existing = await this.prisma.systemSetting.findMany({
      select: { key: true },
    });
    const have = new Set(existing.map((row) => row.key));
    const missing = Object.entries(DEFAULT_SETTINGS).filter(
      ([key]) => !have.has(key),
    );
    if (missing.length === 0) return;
    await this.prisma.systemSetting.createMany({
      data: missing.map(([key, value]) => ({ key, value })),
      skipDuplicates: true,
    });
  }
}
