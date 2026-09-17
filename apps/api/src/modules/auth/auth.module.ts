import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RefreshTokenModule } from './refresh-token.module';
import { VerificationCodeStore } from './verification-code.store';
import { MailModule } from '../mail/mail.module';
import { WebsocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [
    UsersModule,
    JwtModule,
    PassportModule,
    MailModule,
    RefreshTokenModule,
    WebsocketModule,
  ],
  providers: [
    AuthService,
    VerificationCodeStore,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
