import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, ModerateReviewDto } from './dto/content.dto';

const reviewInclude = {
  photos: true,
  user: {
    select: {
      id: true,
      email: true,
      individualProfile: { select: { firstName: true, lastName: true } },
      professionalProfile: { select: { companyName: true } },
    },
  },
  product: {
    select: {
      id: true,
      sku: true,
      nameFr: true,
      nameEn: true,
      slugFr: true,
      slugEn: true,
    },
  },
} as const;

type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

function publicAuthorName(user: ReviewWithRelations['user']): string {
  const first = user.individualProfile?.firstName?.trim();
  const last = user.individualProfile?.lastName?.trim();
  if (first) {
    const initial = last ? ` ${last.charAt(0).toUpperCase()}.` : '';
    return `${first}${initial}`;
  }
  const company = user.professionalProfile?.companyName?.trim();
  if (company) return company;
  return 'Client DISCOVER';
}

function toPublicReview(review: ReviewWithRelations) {
  return {
    id: review.id,
    productId: review.productId,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    createdAt: review.createdAt,
    authorName: publicAuthorName(review.user),
    photos: review.photos.map((p) => ({ id: p.id, fileUrl: p.fileUrl })),
  };
}

function toAdminReview(review: ReviewWithRelations) {
  return {
    id: review.id,
    productId: review.productId,
    userId: review.userId,
    orderId: review.orderId,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    isApproved: review.isApproved,
    isVisible: review.isVisible,
    createdAt: review.createdAt,
    moderatedAt: review.moderatedAt,
    authorName: publicAuthorName(review.user),
    authorEmail: review.user.email,
    product: review.product,
    photos: review.photos.map((p) => ({ id: p.id, fileUrl: p.fileUrl })),
  };
}

function toOwnerReview(review: ReviewWithRelations) {
  return {
    ...toPublicReview(review),
    isApproved: review.isApproved,
    isVisible: review.isVisible,
    product: review.product,
  };
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        productId_userId: { productId: dto.productId, userId },
      },
    });
    if (existing) {
      throw new BadRequestException('Vous avez déjà noté ce produit');
    }

    // Lien optionnel à une commande livrée si elle existe (pas obligatoire).
    const purchased = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: {
          userId,
          status: {
            in: [
              OrderStatus.DELIVERED,
              OrderStatus.RETURNED,
              OrderStatus.REFUNDED,
            ],
          },
        },
      },
    });

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        orderId: purchased?.orderId ?? null,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        photos: dto.photoUrls?.length
          ? { create: dto.photoUrls.map((fileUrl) => ({ fileUrl })) }
          : undefined,
      },
      include: reviewInclude,
    });

    await this.audit.log({
      userId,
      action: 'REVIEW_CREATED',
      entity: 'Review',
      entityId: review.id,
    });

    // Pas de recalcul ici : l'avis reste privé jusqu'à validation admin.
    return {
      ...toOwnerReview(review),
      message: 'Votre avis a été envoyé et est en attente de validation',
    };
  }

  async listForProduct(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
        isVisible: true,
      },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map(toPublicReview);
  }

  async listMine(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map(toOwnerReview);
  }

  async listAdmin(pendingOnly = false) {
    const reviews = await this.prisma.review.findMany({
      where: pendingOnly ? { isApproved: false } : undefined,
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return reviews.map(toAdminReview);
  }

  async moderate(id: string, adminId: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        isApproved: dto.isApproved,
        isVisible: dto.isVisible ?? dto.isApproved,
        moderatedAt: new Date(),
        moderatedById: adminId,
      },
      include: reviewInclude,
    });

    await this.recomputeProductRatings(review.productId);

    await this.audit.log({
      userId: adminId,
      action: 'REVIEW_MODERATED',
      entity: 'Review',
      entityId: id,
      metadata: { isApproved: dto.isApproved, isVisible: updated.isVisible },
    });

    return toAdminReview(updated);
  }

  async delete(id: string, userId: string, role: Role) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (
      review.userId !== userId &&
      role !== Role.ADMIN &&
      role !== Role.DEVELOPER
    ) {
      throw new ForbiddenException('Access denied');
    }
    await this.prisma.review.delete({ where: { id } });
    await this.recomputeProductRatings(review.productId);
    return { deleted: true };
  }

  private async recomputeProductRatings(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isApproved: true, isVisible: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingsAvg: new Prisma.Decimal(
          Number((agg._avg.rating ?? 0).toFixed(2)),
        ),
        ratingsCount: agg._count._all,
      },
    });
  }
}
