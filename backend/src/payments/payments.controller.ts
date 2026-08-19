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
import { PaymentStatus, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  CurrentUser,
  Public,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import {
  AdminRejectPaymentDto,
  CmiCallbackDto,
  InitiatePaymentDto,
  SubmitPaymentProofDto,
  UpsertPaymentSettingDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

const paymentProofDir = join(
  process.cwd(),
  process.env.UPLOAD_DIR ?? 'uploads',
  'payments',
);
mkdirSync(paymentProofDir, { recursive: true });

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('methods')
  listMethods() {
    return this.paymentsService.listMethods();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin')
  listAdmin(@Query('status') status?: PaymentStatus) {
    return this.paymentsService.listAdmin(status);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/settings')
  listSettings() {
    return this.paymentsService.listSettings();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('admin/:paymentId')
  getAdmin(@Param('paymentId') paymentId: string) {
    return this.paymentsService.findOneAdmin(paymentId);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('admin/settings')
  upsertSetting(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPaymentSettingDto,
  ) {
    return this.paymentsService.upsertSetting(dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:paymentId/confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.confirmBankPayment(paymentId, user.id);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:paymentId/confirm-cod')
  confirmCod(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.confirmCodPayment(paymentId, user.id);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:paymentId/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: AdminRejectPaymentDto,
  ) {
    return this.paymentsService.rejectBankPayment(paymentId, user.id, dto);
  }

  @Get('order/:orderId')
  listForOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.listForOrder(orderId, user.id, user.role);
  }

  @Post('cmi/initiate')
  initiateCmi(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiateCmi(user.id, dto);
  }

  @Public()
  @Post('cmi/callback')
  cmiCallback(@Body() dto: CmiCallbackDto) {
    return this.paymentsService.handleCmiCallback(dto);
  }

  @Public()
  @Get('cmi/return')
  cmiReturn(
    @Query('paymentId') paymentId: string,
    @Query('failed') failed?: string,
  ) {
    return this.paymentsService.cmiReturn(paymentId, failed);
  }

  @Post('cmi/:paymentId/simulate-success')
  simulateCmi(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.simulateCmiSuccess(paymentId, user.id);
  }

  @Post('bank-transfer/initiate')
  initiateBank(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiateBankTransfer(user.id, dto);
  }

  @Post('stripe/initiate')
  initiateStripe(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiateStripe(user.id, dto);
  }

  @Post('cod/initiate')
  initiateCod(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiateCod(user.id, dto);
  }

  @Post(':paymentId/proof')
  submitProof(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: SubmitPaymentProofDto,
  ) {
    return this.paymentsService.submitProof(paymentId, user.id, dto);
  }

  @Post(':paymentId/proof-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: paymentProofDir,
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
        ].includes(file.mimetype);
        callback(
          allowed
            ? null
            : new BadRequestException(
                'Format invalide. Utilisez PDF, JPG, PNG ou WEBP.',
              ),
          allowed,
        );
      },
    }),
  )
  submitProofFile(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
    @UploadedFile()
    file?: {
      filename: string;
    },
    @Body('note') note?: string,
  ) {
    if (!file) throw new BadRequestException('Justificatif requis');
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
    const proofUrl = `${appUrl.replace(/\/$/, '')}/${uploadDir}/payments/${file.filename}`;
    return this.paymentsService.submitProof(paymentId, user.id, {
      proofUrl,
      note,
    });
  }
}
