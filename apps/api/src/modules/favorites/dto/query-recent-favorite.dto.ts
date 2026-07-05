import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Danh sách câu hỏi đã lưu gần nhất (hiển thị trong drawer ở Header). */
export class QueryRecentFavoriteDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  limit?: number;
}
