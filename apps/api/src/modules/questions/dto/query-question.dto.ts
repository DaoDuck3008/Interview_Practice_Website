import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Level } from '@prisma/client';

export class QueryQuestionDto {
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;
}
