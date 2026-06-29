import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '@prisma/client';

export class QuerySubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  /** Khớp theo tên hoặc email người dùng (không phân biệt hoa thường). */
  @IsOptional()
  @IsString()
  search?: string;

  /** Lọc theo ngày bắt đầu (startedAt) — từ ngày (YYYY-MM-DD hoặc ISO). */
  @IsOptional()
  @IsDateString()
  startedFrom?: string;

  /** Lọc theo ngày bắt đầu (startedAt) — đến ngày (YYYY-MM-DD hoặc ISO). */
  @IsOptional()
  @IsDateString()
  startedTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
