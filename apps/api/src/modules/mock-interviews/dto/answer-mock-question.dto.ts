import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_AUDIO_DURATION_SEC } from '../../../common/upload/audio.constants';

export class AnswerMockQuestionDto {
  @Type(() => Number)
  @IsInt({ message: 'Thời lượng audio phải là số nguyên.' })
  @Min(0, { message: 'Thời lượng audio không được âm.' })
  @Max(MAX_AUDIO_DURATION_SEC, {
    message: 'Audio không được vượt quá 4 phút.',
  })
  duration: number;
}
