import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  // ID token (credential) Google trả về cho frontend, gửi lên để backend verify
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
