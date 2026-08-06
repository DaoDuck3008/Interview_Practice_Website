import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import {
  MAX_MOCK_CV_DURATION_SECONDS,
  MAX_MOCK_CV_QUESTIONS,
  MIN_MOCK_CV_DURATION_SECONDS,
  MIN_MOCK_CV_QUESTIONS,
} from '../mock-cv.constants';

export class StartMockCvInterviewDto {
  @Type(() => Number)
  @IsInt({ message: 'Số câu hỏi phải là số nguyên.' })
  @Min(MIN_MOCK_CV_QUESTIONS, {
    message: `Mock CV phải có ít nhất ${MIN_MOCK_CV_QUESTIONS} câu hỏi.`,
  })
  @Max(MAX_MOCK_CV_QUESTIONS, {
    message: `Mock CV tối đa ${MAX_MOCK_CV_QUESTIONS} câu hỏi.`,
  })
  totalQuestions: number;

  @Type(() => Number)
  @IsInt({ message: 'Thời lượng phải là số nguyên.' })
  @Min(MIN_MOCK_CV_DURATION_SECONDS, {
    message: 'Thời lượng tối thiểu là 5 phút.',
  })
  @Max(MAX_MOCK_CV_DURATION_SECONDS, {
    message: 'Thời lượng tối đa là 120 phút.',
  })
  durationSeconds: number;
}
