import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryMockCvDto {
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi.' })
  @MaxLength(120, { message: 'Từ khóa tìm kiếm tối đa 120 ký tự.' })
  search?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest'], {
    message: 'Thứ tự sắp xếp không hợp lệ.',
  })
  sortOrder?: 'newest' | 'oldest';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số bản ghi mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số bản ghi mỗi trang phải lớn hơn hoặc bằng 1.' })
  @Max(50, { message: 'Số bản ghi mỗi trang tối đa là 50.' })
  limit?: number;
}
