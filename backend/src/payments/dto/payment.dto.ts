import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class InitiatePaymentDto {
  @IsString()
  orderId!: string;
}

export class SubmitPaymentProofDto {
  @IsUrl()
  proofUrl!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CmiCallbackDto {
  @IsString()
  paymentId!: string;

  @IsString()
  orderNumber!: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsString()
  ProcReturnCode?: string;

  @IsOptional()
  @IsString()
  Response?: string;

  @IsOptional()
  @IsString()
  TransId?: string;

  @IsOptional()
  @IsString()
  HASH?: string;
}

export class AdminRejectPaymentDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class UpdatePaymentSettingDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  labelFr?: string;

  @IsOptional()
  @IsString()
  labelEn?: string;
}

export class UpsertPaymentSettingDto {
  @IsEnum(PaymentMethod)
  provider!: PaymentMethod;

  @Type(() => Boolean)
  @IsBoolean()
  isEnabled!: boolean;

  @IsString()
  @MinLength(2)
  labelFr!: string;

  @IsString()
  @MinLength(2)
  labelEn!: string;
}
