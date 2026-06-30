import { IsEmail } from 'class-validator';

/** Dùng chung cho gửi lại mã xác thực và yêu cầu quên mật khẩu. */
export class ResendCodeDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
