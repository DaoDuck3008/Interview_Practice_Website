import { IsDateString } from 'class-validator';

/** Khoảng ngày đối soát với Sepay (bắt buộc, theo ngày giao dịch ngân hàng). */
export class ReconcileQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
