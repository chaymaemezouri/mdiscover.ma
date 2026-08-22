import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  CurrentUser,
  Public,
  Roles,
} from '../../common/decorators/auth.decorators';
import type { AuthUser } from '../../common/decorators/auth.decorators';
import {
  AdjustStockDto,
  AddImagesDto,
  CreateLotDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

const productImageDir = join(
  process.cwd(),
  process.env.UPLOAD_DIR ?? 'uploads',
  'products',
);
mkdirSync(productImageDir, { recursive: true });

const IMAGE_EXT = [
  '.jpg',
  '.jpeg',
  '.jfif',
  '.pjpeg',
  '.pjp',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.tif',
  '.tiff',
  '.heic',
  '.heif',
  '.avif',
  '.ico',
];

function imageExtension(originalname: string, mimetype: string) {
  const fromName = extname(originalname || '').toLowerCase();
  if (IMAGE_EXT.includes(fromName)) return fromName;
  const fromMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/pjpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',
    'image/tiff': '.tiff',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/avif': '.avif',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
  };
  return fromMime[mimetype] ?? '.jpg';
}

function isAllowedImage(file: { originalname: string; mimetype: string }) {
  if (file.mimetype?.startsWith('image/')) return true;
  const ext = extname(file.originalname || '').toLowerCase();
  return IMAGE_EXT.includes(ext);
}

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get('products')
  listPublic(
    @Query('category') categorySlug?: string,
    @Query('brand') brandSlug?: string,
    @Query('promo') promo?: string,
    @Query('featured') featured?: string,
    @Query('new') isNew?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAllPublic({
      categorySlug,
      brandSlug,
      promo: promo === '1' || promo === 'true',
      featured: featured === '1' || featured === 'true',
      isNew: isNew === '1' || isNew === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Public()
  @Get('products/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale: 'fr' | 'en' = 'fr',
  ) {
    return this.productsService.findBySlug(slug, locale);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/products')
  listAdmin(@Query('includeInactive') includeInactive?: string) {
    return this.productsService.findAllAdmin(includeInactive === 'true');
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/products/alerts/expiring')
  expiringLots(@Query('withinDays') withinDays?: string) {
    return this.productsService.listExpiringLots(
      withinDays ? Number(withinDays) : 30,
    );
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/products/alerts/low-stock')
  lowStock(@Query('threshold') threshold?: string) {
    return this.productsService.listLowStock(
      threshold ? Number(threshold) : 10,
    );
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/products/:id')
  getAdmin(@Param('id') id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/products/upload-images')
  @UseInterceptors(
    FilesInterceptor('files', 12, {
      storage: diskStorage({
        destination: productImageDir,
        filename: (_req, file, callback) => {
          callback(
            null,
            `${randomUUID()}${imageExtension(file.originalname, file.mimetype)}`,
          );
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = isAllowedImage(file);
        callback(
          allowed
            ? null
            : new BadRequestException(
                'Format d’image non reconnu. JPG, PNG, WEBP, GIF, HEIC, AVIF, SVG, BMP, TIFF…',
              ),
          allowed,
        );
      },
    }),
  )
  uploadImages(
    @UploadedFiles()
    files?: Array<{
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
  ) {
    if (!files?.length) {
      throw new BadRequestException('Aucune image envoyée');
    }
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
    return {
      files: files.map((file) => ({
        url: `${appUrl}/${uploadDir}/products/${file.filename}`,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      })),
    };
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/products')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(dto, user);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/products/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Delete('admin/products/:id')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.remove(id, user);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/products/:id/images')
  addImages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddImagesDto,
  ) {
    return this.productsService.addImages(id, dto.images, user);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Delete('admin/products/:id/images/:imageId')
  removeImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.removeImage(id, imageId, user);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/products/:id/images/:imageId/primary')
  setPrimaryImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.setPrimaryImage(id, imageId, user);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/products/:id/lots')
  addLot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateLotDto,
  ) {
    return this.productsService.addLot(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/products/:id/stock')
  adjustStock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(id, dto, user);
  }
}
