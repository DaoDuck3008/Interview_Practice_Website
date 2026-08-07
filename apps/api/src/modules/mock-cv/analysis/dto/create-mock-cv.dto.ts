import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMockCvDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Vị trí ứng tuyển phải là chuỗi.' })
  @MinLength(2, { message: 'Vị trí ứng tuyển phải có ít nhất 2 ký tự.' })
  @MaxLength(120, { message: 'Vị trí ứng tuyển tối đa 120 ký tự.' })
  targetRole: string;
}
