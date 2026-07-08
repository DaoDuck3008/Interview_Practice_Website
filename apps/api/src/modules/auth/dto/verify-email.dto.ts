import { IsEmail, Matches, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254, { message: 'Email tối đa 254 ký tự' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'Mã xác thực gồm 6 chữ số' })
  code: string;
}
