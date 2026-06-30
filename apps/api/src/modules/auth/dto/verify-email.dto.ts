import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'Mã xác thực gồm 6 chữ số' })
  code: string;
}
