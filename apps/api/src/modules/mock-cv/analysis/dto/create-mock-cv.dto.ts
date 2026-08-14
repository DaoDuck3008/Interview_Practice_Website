import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt } from 'class-validator';
import {
  MOCK_CV_DURATION_OPTIONS_SECONDS,
  MOCK_CV_QUESTION_OPTIONS,
  MockCvTargetRoleCode,
} from '../mock-cv.constants';

export class CreateMockCvDto {
  @IsEnum(MockCvTargetRoleCode, {
    message: 'Vị trí ứng tuyển không nằm trong danh sách được hỗ trợ.',
  })
  targetRoleCode: MockCvTargetRoleCode;

  @Type(() => Number)
  @IsInt({ message: 'Số câu hỏi phải là số nguyên.' })
  @IsIn(MOCK_CV_QUESTION_OPTIONS, {
    message: 'Số câu hỏi chỉ có thể là 10, 20 hoặc 30 câu.',
  })
  totalQuestions: number;

  @Type(() => Number)
  @IsInt({ message: 'Thời lượng phải là số nguyên.' })
  @IsIn(MOCK_CV_DURATION_OPTIONS_SECONDS, {
    message: 'Thời lượng chỉ có thể là 15, 30, 45 hoặc 60 phút.',
  })
  durationSeconds: number;
}
