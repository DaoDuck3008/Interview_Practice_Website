import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Level } from '@prisma/client';

export class UpdateQuestionDto {
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  detailAnswerKey?: string;

  @IsOptional()
  @IsString()
  answerKeySummary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answerKeywords?: string[];

  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
