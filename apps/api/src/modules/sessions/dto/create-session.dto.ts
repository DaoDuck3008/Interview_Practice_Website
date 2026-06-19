import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSessionDto {
  @IsUUID()
  questionId: string;

  // Field từ multipart form là string -> ép về number trước khi validate
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7200)
  duration: number;
}
