import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RefundType,
  ReturnReason,
  ReturnStatus,
} from '@prisma/client';

export class CreateReturnItemDto {
  @IsString()
  orderItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsEnum(ReturnReason)
  reason?: ReturnReason;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateReturnDto {
  @IsString()
  orderId!: string;

  @IsEnum(ReturnReason)
  reason!: ReturnReason;

  @IsOptional()
  @IsString()
  @MinLength(3)
  comment?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items!: CreateReturnItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class AddReturnPhotosDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photoUrls!: string[];
}

export class UpdateReturnTrackingDto {
  @IsOptional()
  @IsString()
  returnCarrierName?: string;

  @IsString()
  @MinLength(3)
  returnTrackingNumber!: string;
}

export class ReviewReturnDto {
  @IsEnum(ReturnStatus)
  status!: ReturnStatus; // APPROVED | REJECTED | UNDER_REVIEW | AWAITING_RETURN_SHIPMENT

  @IsOptional()
  @IsString()
  adminNote?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ReceiveReturnDto {
  @IsOptional()
  @IsBoolean()
  restock?: boolean;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class CreateRefundDto {
  @IsEnum(RefundType)
  type!: RefundType;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  generateCreditNote?: boolean;

  @IsOptional()
  @IsBoolean()
  markOrderRefunded?: boolean;
}
