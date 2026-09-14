import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TechnicalTermStatus } from '@prisma/client';

export class UpdateTechnicalTermDto {
  @IsOptional() @IsString() @MaxLength(60) canonicalTerm?: string;
  @IsOptional() @IsString() @MaxLength(2000) explanation?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
  @IsOptional() @IsBoolean() isVerified?: boolean;
  @IsOptional() @IsEnum(TechnicalTermStatus) status?: TechnicalTermStatus;
}
