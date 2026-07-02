import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Level } from '@prisma/client';

/** Trạng thái báo cáo dùng để lọc danh sách session ở trang admin. */
export type FlaggedFilter = 'all' | 'none' | 'pending' | 'resolved';

/** Admin: liệt kê session của mọi user, có filter + phân trang. */
export class QueryAdminSessionDto {
  /** Tìm theo tên hoặc email người luyện tập. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  /** Lọc theo trạng thái báo cáo. Mặc định (không truyền) = không lọc. */
  @IsOptional()
  @IsIn(['all', 'none', 'pending', 'resolved'])
  flagged?: FlaggedFilter;

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
  @Max(100)
  limit?: number;
}
