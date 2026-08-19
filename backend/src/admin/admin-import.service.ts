import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PurchaseMode } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SlugService } from '../common/utils/slug.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseCsv } from './csv.util';

@Injectable()
export class AdminImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slug: SlugService,
    private readonly audit: AuditService,
  ) {}

  async importProducts(csv: string, adminId: string, dryRun = false) {
    const { headers, rows } = parseCsv(csv);
    const required = ['nameFr', 'price', 'categorySlugFr'];
    for (const col of required) {
      if (!headers.includes(col)) {
        throw new BadRequestException(`Missing CSV column: ${col}`);
      }
    }

    const result = {
      dryRun,
      total: rows.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; sku: string; error: string }>,
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const nameFr = row.nameFr?.trim();
      const nameEn = row.nameEn?.trim() || nameFr;
      let sku = row.sku?.trim();
      try {
        if (!nameFr) throw new Error('nameFr is required');
        const price = Number(row.price);
        if (Number.isNaN(price) || price < 0) {
          throw new Error('invalid price');
        }

        const category = await this.prisma.category.findUnique({
          where: { slugFr: row.categorySlugFr },
        });
        if (!category) {
          throw new Error(`category not found: ${row.categorySlugFr}`);
        }

        let brandId: string | undefined;
        if (row.brandSlugFr) {
          const brand = await this.prisma.brand.findUnique({
            where: { slugFr: row.brandSlugFr },
          });
          if (!brand) throw new Error(`brand not found: ${row.brandSlugFr}`);
          brandId = brand.id;
        }

        const purchaseMode =
          (row.purchaseMode as PurchaseMode) || PurchaseMode.DIRECT;
        if (!Object.values(PurchaseMode).includes(purchaseMode)) {
          throw new Error(`invalid purchaseMode: ${row.purchaseMode}`);
        }

        if (!sku) {
          sku = await this.nextSku(nameFr);
        }

        const existing = await this.prisma.product.findUnique({
          where: { sku },
        });

        if (dryRun) {
          if (existing) result.updated += 1;
          else result.created += 1;
          continue;
        }

        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              nameFr,
              nameEn,
              price,
              promoPrice: row.promoPrice ? Number(row.promoPrice) : null,
              stockQty: row.stockQty ? parseInt(row.stockQty, 10) : existing.stockQty,
              purchaseMode,
              categoryId: category.id,
              brandId: brandId ?? null,
              originCountry: row.originCountry || null,
              packaging: row.packaging || null,
              isActive:
                row.isActive === undefined || row.isActive === ''
                  ? existing.isActive
                  : row.isActive.toLowerCase() === 'true' || row.isActive === '1',
            },
          });
          result.updated += 1;
        } else {
          const slugs = await this.prisma.product.findMany({
            select: { slugFr: true, slugEn: true },
          });
          const slugFr = this.slug.unique(
            nameFr,
            slugs.map((p) => p.slugFr),
          );
          const slugEn = this.slug.unique(
            nameEn,
            slugs.map((p) => p.slugEn),
          );
          await this.prisma.product.create({
            data: {
              sku,
              nameFr,
              nameEn,
              slugFr,
              slugEn,
              price,
              promoPrice: row.promoPrice ? Number(row.promoPrice) : null,
              stockQty: row.stockQty ? parseInt(row.stockQty, 10) : 0,
              purchaseMode,
              categoryId: category.id,
              brandId,
              originCountry: row.originCountry || null,
              packaging: row.packaging || null,
              isActive:
                row.isActive === undefined || row.isActive === ''
                  ? true
                  : row.isActive.toLowerCase() === 'true' || row.isActive === '1',
            },
          });
          result.created += 1;
        }
      } catch (err) {
        result.errors.push({
          row: i + 2,
          sku: sku || '',
          error: err instanceof Error ? err.message : 'unknown error',
        });
      }
    }

    if (!dryRun) {
      await this.audit.log({
        userId: adminId,
        action: 'PRODUCTS_CSV_IMPORTED',
        entity: 'Product',
        metadata: {
          total: result.total,
          created: result.created,
          updated: result.updated,
          errors: result.errors.length,
        },
      });
    }

    return result;
  }

  private async nextSku(name: string) {
    const compact = this.slug
      .slugify(name)
      .replace(/-/g, '')
      .toUpperCase()
      .slice(0, 14);
    const base = compact ? `MD-${compact}` : 'MD-PROD';
    const clash = await this.prisma.product.findUnique({ where: { sku: base } });
    if (!clash) return base;
    let i = 2;
    let candidate = `${base}-${i}`;
    while (await this.prisma.product.findUnique({ where: { sku: candidate } })) {
      i += 1;
      candidate = `${base}-${i}`;
    }
    return candidate;
  }
}
