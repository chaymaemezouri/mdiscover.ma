import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuoteStatus, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  CurrentUser,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import {
  AdminPrepareQuoteDto,
  AdminRejectQuoteDto,
  ConvertQuoteDto,
  CreateQuoteDto,
  RequestQuoteModificationDto,
} from './dto/quote.dto';
import { QuotesService } from './quotes.service';

const quoteAttachmentDir = join(
  process.cwd(),
  process.env.UPLOAD_DIR ?? 'uploads',
  'quotes',
  'attachments',
);
mkdirSync(quoteAttachmentDir, { recursive: true });

@Controller()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('quotes')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuoteDto) {
    return this.quotesService.create(user.id, dto);
  }

  @Post('quotes/attachments')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: quoteAttachmentDir,
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = [
          'application/pdf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png',
          'image/webp',
        ].includes(file.mimetype);
        callback(
          allowed
            ? null
            : new BadRequestException(
                'Format invalide. Utilisez PDF, Excel, JPG, PNG ou WEBP.',
              ),
          allowed,
        );
      },
    }),
  )
  uploadAttachment(
    @UploadedFile()
    file?: {
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
    const fileUrl = `${appUrl.replace(/\/$/, '')}/${uploadDir}/quotes/attachments/${file.filename}`;
    return {
      fileUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  @Get('quotes')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  listMine(@CurrentUser() user: AuthUser) {
    return this.quotesService.listMine(user.id);
  }

  @Get('quotes/:id')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.getOne(id, user.id, user.role);
  }

  @Post('quotes/:id/accept')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.accept(id, user.id);
  }

  @Post('quotes/:id/reject')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.reject(id, user.id);
  }

  @Post('quotes/:id/request-modification')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  requestModification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RequestQuoteModificationDto,
  ) {
    return this.quotesService.requestModification(id, user.id, dto);
  }

  @Post('quotes/:id/convert')
  @Roles(Role.CUSTOMER_PRO, Role.ADMIN, Role.DEVELOPER)
  convert(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConvertQuoteDto,
  ) {
    return this.quotesService.convertToOrder(id, user.id, dto);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/quotes')
  listAdmin(@Query('status') status?: QuoteStatus) {
    return this.quotesService.listAdmin(status);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Patch('admin/quotes/:id/review')
  markInReview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.markInReview(id, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/quotes/:id/prepare')
  prepare(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminPrepareQuoteDto,
  ) {
    return this.quotesService.prepareAndOptionallySend(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/quotes/:id/send')
  send(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.send(id, user.id);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/quotes/:id/reject')
  adminReject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminRejectQuoteDto,
  ) {
    return this.quotesService.adminReject(id, user.id, dto.reason);
  }
}
