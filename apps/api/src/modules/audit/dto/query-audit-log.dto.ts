import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AuditAction, AuditActorType } from '@prisma/client';

export class QueryAuditLogDto {
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  @MaxLength(120, { message: 'Từ khóa tìm kiếm tối đa 120 ký tự' })
  search?: string;

  @IsOptional()
  @IsEnum(AuditAction, { message: 'Hành động audit không hợp lệ' })
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditActorType, { message: 'Loại người thực hiện không hợp lệ' })
  actorType?: AuditActorType;

  @IsOptional()
  @IsString({ message: 'Loại đối tượng phải là chuỗi' })
  @MaxLength(80, { message: 'Loại đối tượng tối đa 80 ký tự' })
  entityType?: string;

  @IsOptional()
  @IsString({ message: 'actorId phải là chuỗi' })
  @MaxLength(80, { message: 'actorId tối đa 80 ký tự' })
  actorId?: string;

  @IsOptional()
  @IsString({ message: 'targetUserId phải là chuỗi' })
  @MaxLength(80, { message: 'targetUserId tối đa 80 ký tự' })
  targetUserId?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Ngày bắt đầu không hợp lệ' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Ngày kết thúc không hợp lệ' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên' })
  @Min(1, { message: 'Số dòng mỗi trang phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Số dòng mỗi trang tối đa 100' })
  limit?: number;
}
