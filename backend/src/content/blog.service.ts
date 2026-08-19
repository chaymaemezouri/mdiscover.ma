import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { SlugService } from '../common/utils/slug.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/content.dto';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slug: SlugService,
    private readonly audit: AuditService,
  ) {}

  listPublished() {
    return this.prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slugFr: true,
        slugEn: true,
        titleFr: true,
        titleEn: true,
        excerptFr: true,
        excerptEn: true,
        coverUrl: true,
        publishedAt: true,
      },
    });
  }

  async getBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        isPublished: true,
        OR: [{ slugFr: slug }, { slugEn: slug }],
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  listAdmin() {
    return this.prisma.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(adminId: string, dto: CreateBlogPostDto) {
    const slugFr =
      dto.slugFr ??
      (await this.uniqueSlug('slugFr', this.slug.slugify(dto.titleFr)));
    const slugEn =
      dto.slugEn ??
      (await this.uniqueSlug('slugEn', this.slug.slugify(dto.titleEn)));

    const isPublished = dto.isPublished ?? false;
    const post = await this.prisma.blogPost.create({
      data: {
        titleFr: dto.titleFr,
        titleEn: dto.titleEn,
        slugFr,
        slugEn,
        excerptFr: dto.excerptFr,
        excerptEn: dto.excerptEn,
        contentFr: dto.contentFr,
        contentEn: dto.contentEn,
        coverUrl: dto.coverUrl,
        seoTitleFr: dto.seoTitleFr,
        seoTitleEn: dto.seoTitleEn,
        seoDescriptionFr: dto.seoDescriptionFr,
        seoDescriptionEn: dto.seoDescriptionEn,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        authorId: adminId,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'BLOG_POST_CREATED',
      entity: 'BlogPost',
      entityId: post.id,
    });

    return post;
  }

  async update(id: string, adminId: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');

    let publishedAt = existing.publishedAt;
    if (dto.isPublished === true && !existing.isPublished) {
      publishedAt = new Date();
    }
    if (dto.isPublished === false) {
      publishedAt = null;
    }

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...dto,
        publishedAt,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'BLOG_POST_UPDATED',
      entity: 'BlogPost',
      entityId: id,
    });

    return post;
  }

  async remove(id: string, adminId: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: 'BLOG_POST_DELETED',
      entity: 'BlogPost',
      entityId: id,
    });
    return { deleted: true };
  }

  private async uniqueSlug(
    field: 'slugFr' | 'slugEn',
    base: string,
  ): Promise<string> {
    const existing = await this.prisma.blogPost.findMany({
      select: { slugFr: true, slugEn: true },
    });
    const list = existing.map((e) => e[field]);
    return this.slug.unique(base, list);
  }
}
