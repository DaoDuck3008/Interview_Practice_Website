import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Người dùng báo điểm chấm sai/khiếu nại cho 1 session đã chấm. */
export class FlagScoreDto {
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason?: string;
}
