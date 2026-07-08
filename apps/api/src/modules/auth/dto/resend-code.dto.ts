import { IsEmail, MaxLength } from 'class-validator';

/** Dùng chung cho gửi lại mã xác thực và yêu cầu quên mật khẩu. */
export class ResendCodeDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254, { message: 'Email tối đa 254 ký tự' })
  email: string;
}
