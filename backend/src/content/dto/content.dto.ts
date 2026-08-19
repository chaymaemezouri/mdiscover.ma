import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  BannerPlacement,
  LegalPageType,
  Locale,
} from '@prisma/client';

export class CreateReviewDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class ModerateReviewDto {
  @IsBoolean()
  isApproved!: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class CreateBlogPostDto {
  @IsString()
  @MinLength(3)
  titleFr!: string;

  @IsString()
  @MinLength(3)
  titleEn!: string;

  @IsOptional()
  @IsString()
  slugFr?: string;

  @IsOptional()
  @IsString()
  slugEn?: string;

  @IsOptional()
  @IsString()
  excerptFr?: string;

  @IsOptional()
  @IsString()
  excerptEn?: string;

  @IsString()
  @MinLength(10)
  contentFr!: string;

  @IsString()
  @MinLength(10)
  contentEn!: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  seoTitleFr?: string;

  @IsOptional()
  @IsString()
  seoTitleEn?: string;

  @IsOptional()
  @IsString()
  seoDescriptionFr?: string;

  @IsOptional()
  @IsString()
  seoDescriptionEn?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  titleFr?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  titleEn?: string;

  @IsOptional()
  @IsString()
  slugFr?: string;

  @IsOptional()
  @IsString()
  slugEn?: string;

  @IsOptional()
  @IsString()
  excerptFr?: string;

  @IsOptional()
  @IsString()
  excerptEn?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  contentFr?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  contentEn?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  seoTitleFr?: string;

  @IsOptional()
  @IsString()
  seoTitleEn?: string;

  @IsOptional()
  @IsString()
  seoDescriptionFr?: string;

  @IsOptional()
  @IsString()
  seoDescriptionEn?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateFaqDto {
  @IsString()
  category!: string;

  @IsString()
  @MinLength(3)
  question!: string;

  @IsString()
  @MinLength(3)
  answer!: string;

  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  answer?: string;

  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertLegalPageDto {
  @IsEnum(LegalPageType)
  type!: LegalPageType;

  @IsEnum(Locale)
  locale!: Locale;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(10)
  content!: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateBannerDto {
  @IsEnum(BannerPlacement)
  placement!: BannerPlacement;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  titleFr?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  subtitleFr?: string;

  @IsOptional()
  @IsString()
  subtitleEn?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsEnum(BannerPlacement)
  placement?: BannerPlacement;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  titleFr?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  subtitleFr?: string;

  @IsOptional()
  @IsString()
  subtitleEn?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class CreateStockAlertDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class FavoriteProductDto {
  @IsString()
  productId!: string;
}
