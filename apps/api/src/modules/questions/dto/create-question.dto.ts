import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Level } from '@prisma/client';

export class CreateQuestionDto {
  @IsUUID(undefined, { message: 'topicId không hợp lệ' })
  topicId: string;

  @IsString({ message: 'Nội dung câu hỏi phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống' })
  @MaxLength(2000, { message: 'Nội dung câu hỏi tối đa 2000 ký tự' })
  content: string;

  @IsString({ message: 'Đáp án chi tiết phải là chuỗi' })
  @IsNotEmpty({ message: 'Đáp án chi tiết không được để trống' })
  @MaxLength(10000, { message: 'Đáp án chi tiết tối đa 10000 ký tự' })
  detailAnswerKey: string;

  @IsString({ message: 'Tóm tắt đáp án phải là chuỗi' })
  @IsNotEmpty({ message: 'Tóm tắt đáp án không được để trống' })
  @MaxLength(2000, { message: 'Tóm tắt đáp án tối đa 2000 ký tự' })
  answerKeySummary: string;

  @IsArray({ message: 'Từ khóa đáp án phải là một danh sách' })
  @ArrayMaxSize(30, { message: 'Tối đa 30 từ khóa đáp án' })
  @IsString({ each: true, message: 'Mỗi từ khóa phải là chuỗi' })
  @MaxLength(100, {
    each: true,
    message: 'Mỗi từ khóa tối đa 100 ký tự',
  })
  answerKeywords: string[];

  @IsEnum(Level, { message: 'Cấp độ câu hỏi không hợp lệ' })
  level: Level;
}
