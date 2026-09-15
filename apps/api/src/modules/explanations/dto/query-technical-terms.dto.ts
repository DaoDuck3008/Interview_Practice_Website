import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TechnicalTermStatus } from '@prisma/client';

export class QueryTechnicalTermsDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TechnicalTermStatus) status?: TechnicalTermStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 30;
}
