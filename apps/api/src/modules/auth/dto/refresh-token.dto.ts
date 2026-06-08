import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token không được để trống' })
  refreshToken: string;
}
