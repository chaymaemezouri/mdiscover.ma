import { IsOptional, IsString, MinLength } from 'class-validator';

export class CompleteGoogleProfessionalDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsString()
  @MinLength(2)
  contactPerson!: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  ice?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
