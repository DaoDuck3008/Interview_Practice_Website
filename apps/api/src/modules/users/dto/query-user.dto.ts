import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUserDto {
  /** Tìm theo tên hoặc email (không phân biệt hoa thường). */
  @IsOptional()
  @IsString()
  search?: string;

  /** Lọc theo gói: slug của Plan, hoặc 'free' cho user chưa có gói. */
  @IsOptional()
  @IsString()
  plan?: string;

  /** Lọc theo trạng thái xác thực email: 'true' | 'false'. */
  @IsOptional()
  @IsBooleanString()
  verified?: string;

  /** Lọc theo trạng thái khóa: 'true' | 'false'. */
  @IsOptional()
  @IsBooleanString()
  locked?: string;

  /** Trường sắp xếp. */
  @IsOptional()
  @IsIn(['name', 'createdAt'])
  sort?: 'name' | 'createdAt';

  /** Chiều sắp xếp. */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

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
