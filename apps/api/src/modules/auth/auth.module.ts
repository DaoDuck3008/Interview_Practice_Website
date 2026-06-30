import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RefreshTokenStore } from './refresh-token.store';
import { VerificationCodeStore } from './verification-code.store';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [UsersModule, JwtModule, PassportModule, MailModule],
  providers: [
    AuthService,
    RefreshTokenStore,
    VerificationCodeStore,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
