import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  MockCvAnalysisStatus,
  MockCvQuestionGenerationStatus,
  MockInterviewStatus,
} from '@prisma/client';

export type MockCvAdminAttentionFilter = 'all' | 'failed' | 'stale';

export class QueryAdminMockCvDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MockCvAnalysisStatus)
  analysisStatus?: MockCvAnalysisStatus;

  @IsOptional()
  @IsEnum(MockCvQuestionGenerationStatus)
  questionStatus?: MockCvQuestionGenerationStatus;

  @IsOptional()
  @IsEnum(MockInterviewStatus)
  interviewStatus?: MockInterviewStatus;

  @IsOptional()
  @IsIn(['all', 'failed', 'stale'])
  attention?: MockCvAdminAttentionFilter;

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
