import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString({ message: 'slug phải là chuỗi' })
  @MaxLength(80, { message: 'slug tối đa 80 ký tự' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'Tên gói phải là chuỗi' })
  @MaxLength(120, { message: 'Tên gói tối đa 120 ký tự' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Mô tả gói phải là chuỗi' })
  @MaxLength(500, { message: 'Mô tả gói tối đa 500 ký tự' })
  description?: string;

  @IsOptional()
  @IsInt({ message: 'Giá gói phải là số nguyên' })
  @Min(0, { message: 'Giá gói không được âm' })
  @Max(100_000_000, { message: 'Giá gói tối đa 100.000.000 VND' })
  priceVnd?: number;

  @IsOptional()
  @IsInt({ message: 'Thời hạn gói phải là số nguyên' })
  @Min(1, { message: 'Thời hạn gói tối thiểu 1 ngày' })
  @Max(3650, { message: 'Thời hạn gói tối đa 3650 ngày' })
  durationDays?: number;

  @IsOptional()
  @IsBoolean({ message: 'isUnlimited phải là boolean' })
  isUnlimited?: boolean;

  @IsOptional()
  @IsInt({ message: 'Giới hạn ngày phải là số nguyên' })
  @Min(0, { message: 'Giới hạn ngày không được âm' })
  @Max(10_000, { message: 'Giới hạn ngày tối đa 10000 lượt' })
  dailyScoreLimit?: number;

  @IsOptional()
  @IsInt({ message: 'Giới hạn tuần phải là số nguyên' })
  @Min(0, { message: 'Giới hạn tuần không được âm' })
  @Max(100_000, { message: 'Giới hạn tuần tối đa 100000 lượt' })
  weeklyScoreLimit?: number;

  @IsOptional()
  @IsObject({ message: 'limits phải là object' })
  limits?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị không được âm' })
  @Max(10_000, { message: 'Thứ tự hiển thị tối đa 10000' })
  sortOrder?: number;
}
