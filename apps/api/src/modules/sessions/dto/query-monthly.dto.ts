import { IsOptional, Matches } from 'class-validator';

/** Lọc dữ liệu biểu đồ (heatmap + tiến bộ) theo tháng, định dạng YYYY-MM.
 *  Bỏ trống => backend dùng tháng hiện tại (giờ VN). */
export class QueryMonthlyDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month phải có định dạng YYYY-MM' })
  month?: string;
}
