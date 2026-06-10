import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level } from '@prisma/client';

export class QueryAdminQuestionDto {
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  /** Tìm từ khóa trong nội dung câu hỏi (ILIKE %search%) */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'hidden'])
  status?: 'active' | 'hidden';

  /** Trường sắp xếp */
  @IsOptional()
  @IsIn(['topic', 'level', 'content', 'status'])
  sortBy?: 'topic' | 'level' | 'content' | 'status';

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
