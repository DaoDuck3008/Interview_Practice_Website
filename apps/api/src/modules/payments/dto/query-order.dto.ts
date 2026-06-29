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
import { OrderStatus } from '@prisma/client';

/** Trường ngày dùng để lọc khoảng thời gian. */
export enum OrderDateField {
  CREATED = 'createdAt',
  PAID = 'paidAt',
}

export class QueryOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** Khớp theo tên/email người dùng, transferCode hoặc providerTxnId. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Lọc khoảng ngày theo trường nào (mặc định createdAt). */
  @IsOptional()
  @IsEnum(OrderDateField)
  dateField?: OrderDateField;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
