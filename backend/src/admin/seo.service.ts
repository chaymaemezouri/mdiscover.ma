import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async buildSitemapXml(): Promise<string> {
    const appUrl = (
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');

    const [products, categories, brands, posts, legal] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { slugFr: true, slugEn: true, updatedAt: true },
      }),
      this.prisma.category.findMany({
        select: { slugFr: true, slugEn: true, updatedAt: true },
      }),
      this.prisma.brand.findMany({
        where: { isActive: true },
        select: { slugFr: true, slugEn: true, updatedAt: true },
      }),
      this.prisma.blogPost.findMany({
        where: { isPublished: true },
        select: { slugFr: true, slugEn: true, updatedAt: true },
      }),
      this.prisma.legalPage.findMany({
        where: { isPublished: true },
        select: { slug: true, locale: true, updatedAt: true },
      }),
    ]);

    const urls: Array<{ loc: string; lastmod: string }> = [
      { loc: `${appUrl}/`, lastmod: new Date().toISOString() },
      { loc: `${appUrl}/fr/catalogue`, lastmod: new Date().toISOString() },
      { loc: `${appUrl}/en/catalog`, lastmod: new Date().toISOString() },
      { loc: `${appUrl}/fr/blog`, lastmod: new Date().toISOString() },
      { loc: `${appUrl}/en/blog`, lastmod: new Date().toISOString() },
    ];

    for (const p of products) {
      urls.push({
        loc: `${appUrl}/fr/produits/${p.slugFr}`,
        lastmod: p.updatedAt.toISOString(),
      });
      urls.push({
        loc: `${appUrl}/en/products/${p.slugEn}`,
        lastmod: p.updatedAt.toISOString(),
      });
    }
    for (const c of categories) {
      urls.push({
        loc: `${appUrl}/fr/categories/${c.slugFr}`,
        lastmod: c.updatedAt.toISOString(),
      });
      urls.push({
        loc: `${appUrl}/en/categories/${c.slugEn}`,
        lastmod: c.updatedAt.toISOString(),
      });
    }
    for (const b of brands) {
      urls.push({
        loc: `${appUrl}/fr/marques/${b.slugFr}`,
        lastmod: b.updatedAt.toISOString(),
      });
      urls.push({
        loc: `${appUrl}/en/brands/${b.slugEn}`,
        lastmod: b.updatedAt.toISOString(),
      });
    }
    for (const post of posts) {
      urls.push({
        loc: `${appUrl}/fr/blog/${post.slugFr}`,
        lastmod: post.updatedAt.toISOString(),
      });
      urls.push({
        loc: `${appUrl}/en/blog/${post.slugEn}`,
        lastmod: post.updatedAt.toISOString(),
      });
    }
    for (const page of legal) {
      const prefix = page.locale === 'EN' ? 'en' : 'fr';
      urls.push({
        loc: `${appUrl}/${prefix}/legal/${page.slug}`,
        lastmod: page.updatedAt.toISOString(),
      });
    }

    const body = urls
      .map(
        (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
  }

  buildRobotsTxt(): string {
    const appUrl = (
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `User-agent: *
Allow: /

Disallow: /api/
Disallow: /admin/

Sitemap: ${appUrl}/sitemap.xml
`;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
