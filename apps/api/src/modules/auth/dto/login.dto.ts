import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254, { message: 'Email tối đa 254 ký tự' })
  email: string;

  @IsString({ message: 'Mật khẩu không được để trống' })
  password: string;
}
