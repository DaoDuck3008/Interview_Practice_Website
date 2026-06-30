import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi' })
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  oldPassword: string;

  @IsString({ message: 'Mật khẩu mới phải là chuỗi' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  newPassword: string;
}
