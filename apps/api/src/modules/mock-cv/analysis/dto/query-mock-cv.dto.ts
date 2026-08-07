import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryMockCvDto {
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
