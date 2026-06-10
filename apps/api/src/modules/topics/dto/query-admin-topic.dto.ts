import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAdminTopicDto {
  /** Tìm từ khóa trong tên hoặc slug (ILIKE %search%) */
  @IsOptional()
  @IsString()
  search?: string;

  /** Trường sắp xếp */
  @IsOptional()
  @IsIn(['name', 'slug', 'questions'])
  sortBy?: 'name' | 'slug' | 'questions';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;
}
