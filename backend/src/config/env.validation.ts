import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class EnvValidation {
  @IsString()
  @IsNotEmpty()
  NODE_ENV!: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  API_PREFIX?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : parseFloat(value),
  )
  @IsNumber()
  @Min(0)
  TAX_RATE?: number;

  @IsString()
  @IsOptional()
  APP_URL?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL?: string;

  /** SMTP hébergeur (cPanel) — si vide, fallback Gmail */
  @IsString()
  @IsOptional()
  MAIL_HOST?: string;

  @IsString()
  @IsOptional()
  MAIL_PORT?: string;

  @IsString()
  @IsOptional()
  MAIL_SECURE?: string;

  /** Compte SMTP (auth) — souvent contact@ */
  @IsString()
  @IsOptional()
  MAIL_USER?: string;

  @IsString()
  @IsOptional()
  MAIL_PASS?: string;

  /** Ex. "MDiscover <contact@mdiscover.ma>" */
  @IsString()
  @IsOptional()
  MAIL_FROM?: string;

  /** Boîte contact (formulaire général, support client) */
  @IsString()
  @IsOptional()
  MAIL_CONTACT?: string;

  /** Boîte ventes / devis B2B */
  @IsString()
  @IsOptional()
  MAIL_VENTES?: string;

  /** Boîte sales / commandes */
  @IsString()
  @IsOptional()
  MAIL_SALES?: string;

  /** @deprecated — alias de MAIL_CONTACT */
  @IsString()
  @IsOptional()
  MAIL_SUPPORT?: string;
}
