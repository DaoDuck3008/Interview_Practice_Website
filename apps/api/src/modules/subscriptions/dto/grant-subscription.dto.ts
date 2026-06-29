import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Cấp gói thủ công cho 1 user (admin / hỗ trợ KH). */
export class GrantSubscriptionDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  planId: string;

  /** Có → số ngày tùy chỉnh; không → dùng durationDays của gói. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;

  /** Lý do cấp (bắt buộc — phục vụ truy vết). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}
