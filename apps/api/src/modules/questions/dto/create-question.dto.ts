import { IsArray, IsEnum, IsString, IsUUID } from 'class-validator';
import { Level } from '@prisma/client';

export class CreateQuestionDto {
  @IsUUID()
  topicId: string;

  @IsString()
  content: string;

  @IsString()
  answerKeySummary: string;

  @IsArray()
  @IsString({ each: true })
  answerKeywords: string[];

  @IsEnum(Level)
  level: Level;
}
