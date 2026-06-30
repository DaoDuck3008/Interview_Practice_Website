import { Module } from '@nestjs/common';
import { RefreshTokenStore } from './refresh-token.store';

/**
 * Tách RefreshTokenStore ra module riêng để vừa dùng trong AuthModule, vừa
 * dùng trong UsersModule (khóa tài khoản / reset mật khẩu cần thu hồi phiên)
 * mà không gây vòng phụ thuộc giữa hai module.
 */
@Module({
  providers: [RefreshTokenStore],
  exports: [RefreshTokenStore],
})
export class RefreshTokenModule {}
