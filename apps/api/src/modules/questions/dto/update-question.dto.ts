import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Level } from '@prisma/client';

export class UpdateQuestionDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'topicId không hợp lệ' })
  topicId?: string;

  @IsOptional()
  @IsString({ message: 'Nội dung câu hỏi phải là chuỗi' })
  @MaxLength(2000, { message: 'Nội dung câu hỏi tối đa 2000 ký tự' })
  content?: string;

  @IsOptional()
  @IsString({ message: 'Đáp án chi tiết phải là chuỗi' })
  @MaxLength(10000, { message: 'Đáp án chi tiết tối đa 10000 ký tự' })
  detailAnswerKey?: string;

  @IsOptional()
  @IsString({ message: 'Tóm tắt đáp án phải là chuỗi' })
  @MaxLength(2000, { message: 'Tóm tắt đáp án tối đa 2000 ký tự' })
  answerKeySummary?: string;

  @IsOptional()
  @IsArray({ message: 'Từ khóa đáp án phải là một danh sách' })
  @ArrayMaxSize(30, { message: 'Tối đa 30 từ khóa đáp án' })
  @IsString({ each: true, message: 'Mỗi từ khóa phải là chuỗi' })
  @MaxLength(100, {
    each: true,
    message: 'Mỗi từ khóa tối đa 100 ký tự',
  })
  answerKeywords?: string[];

  @IsOptional()
  @IsEnum(Level, { message: 'Cấp độ câu hỏi không hợp lệ' })
  level?: Level;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
