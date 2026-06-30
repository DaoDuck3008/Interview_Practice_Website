import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_AUDIO_DURATION_SEC } from '../../../common/upload/audio.constants';

export class CreateSessionDto {
  @IsUUID()
  questionId: string;

  // Field từ multipart form là string -> ép về number trước khi validate
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_AUDIO_DURATION_SEC, {
    message: 'Audio không được vượt quá 5 phút.',
  })
  duration: number;
}
