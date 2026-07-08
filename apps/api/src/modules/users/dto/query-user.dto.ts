import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUserDto {
  /** Tìm theo tên hoặc email (không phân biệt hoa thường). */
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  @MaxLength(120, { message: 'Từ khóa tìm kiếm tối đa 120 ký tự' })
  search?: string;

  /** Lọc theo gói: slug của Plan, hoặc 'free' cho user chưa có gói. */
  @IsOptional()
  @IsString({ message: 'Bộ lọc gói phải là chuỗi' })
  @MaxLength(80, { message: 'Bộ lọc gói tối đa 80 ký tự' })
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
