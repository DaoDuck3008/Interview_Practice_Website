import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Level } from '@prisma/client';

export type MockInterviewLevelOption = Level | 'MIX';
export const MOCK_INTERVIEW_LEVEL_OPTIONS = [...Object.values(Level), 'MIX'];

export class CreateMockInterviewDto {
  @IsUUID(undefined, { message: 'Topic không hợp lệ.' })
  topicId: string;

  @IsOptional()
  @IsIn(MOCK_INTERVIEW_LEVEL_OPTIONS, { message: 'Độ khó không hợp lệ.' })
  level?: MockInterviewLevelOption;

  @Type(() => Number)
  @IsInt({ message: 'Số câu hỏi phải là số nguyên.' })
  @Min(1, { message: 'Mock interview phải có ít nhất 1 câu hỏi.' })
  @Max(20, { message: 'Mock interview tối đa 20 câu hỏi.' })
  totalQuestions: number;

  @Type(() => Number)
  @IsInt({ message: 'Thời lượng phải là số nguyên.' })
  @Min(300, { message: 'Thời lượng tối thiểu là 5 phút.' })
  @Max(7200, { message: 'Thời lượng tối đa là 120 phút.' })
  durationSeconds: number;
}
