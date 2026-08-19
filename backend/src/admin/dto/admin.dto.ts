import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class UpsertSettingDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  value!: string;
}

export class UpsertSettingsBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertSettingDto)
  items!: UpsertSettingDto[];
}

export class ImportProductsCsvDto {
  /** Raw CSV text (header required) */
  @IsString()
  @MinLength(10)
  csv!: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;
}
