import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTopicDto {
  @IsString({ message: 'slug phải là chuỗi' })
  @MaxLength(80, { message: 'slug tối đa 80 ký tự' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug: string;

  @IsString({ message: 'Tên chủ đề phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên chủ đề không được để trống' })
  @MaxLength(120, { message: 'Tên chủ đề tối đa 120 ký tự' })
  name: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'parentId không hợp lệ' })
  parentId?: string;
}
