import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DeliveryMode, PromoType } from '@prisma/client';

export class CreatePromoCodeDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsEnum(PromoType)
  type!: PromoType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromoCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsEnum(PromoType)
  type?: PromoType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateShippingRateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
