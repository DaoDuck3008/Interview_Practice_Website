import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Level, MockInterviewStatus } from '@prisma/client';

export type MockInterviewAttentionFilter = 'all' | 'failed' | 'stale';

/** Admin: lọc mock interview của toàn hệ thống theo người làm, cấu hình và tình trạng chấm AI. */
export class QueryAdminMockInterviewDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @IsOptional()
  @IsEnum(MockInterviewStatus)
  status?: MockInterviewStatus;

  @IsOptional()
  @IsIn(['all', 'failed', 'stale'])
  attention?: MockInterviewAttentionFilter;

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
