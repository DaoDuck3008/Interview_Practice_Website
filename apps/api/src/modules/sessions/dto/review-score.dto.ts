import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Admin ghi chú nội bộ và/hoặc đánh dấu đã xử lý xong 1 report bị flag. */
export class ReviewScoreDto {
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(1000, { message: 'Ghi chú tối đa 1000 ký tự' })
  note?: string;

  @IsOptional()
  @IsBoolean({ message: 'resolved phải là boolean' })
  resolved?: boolean;
}
