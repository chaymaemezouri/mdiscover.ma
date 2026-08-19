import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            slugFr: true,
            slugEn: true,
            nameFr: true,
            nameEn: true,
            price: true,
            promoPrice: true,
            currency: true,
            stockQty: true,
            packaging: true,
            ratingsAvg: true,
            ratingsCount: true,
            isActive: true,
            brand: {
              select: {
                name: true,
                slugFr: true,
              },
            },
            category: {
              select: {
                nameFr: true,
                slugFr: true,
              },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
              select: {
                url: true,
                isPrimary: true,
                altFr: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
      include: { product: { select: { id: true, nameFr: true, sku: true } } },
    });
  }

  async remove(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
    return { removed: true };
  }

  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await this.remove(userId, productId);
      return { favorited: false };
    }
    await this.add(userId, productId);
    return { favorited: true };
  }
}
