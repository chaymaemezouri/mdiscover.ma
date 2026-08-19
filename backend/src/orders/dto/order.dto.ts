import { IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { OrderDocumentType, OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}

export class AdminOrderNoteDto {
  @IsString()
  note!: string;
}

export class GenerateDocumentDto {
  @IsEnum(OrderDocumentType)
  type!: OrderDocumentType;

  @IsOptional()
  @IsIn(['FR', 'EN'])
  locale?: 'FR' | 'EN';
}
