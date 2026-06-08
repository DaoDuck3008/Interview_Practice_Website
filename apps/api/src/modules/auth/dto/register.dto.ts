import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Tên phải là chuỗi' })
  @MinLength(3, { message: 'Tên phải có ít nhất 3 ký tự' })
  name: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;
}
