import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RefreshTokenModule } from '../auth/refresh-token.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [RefreshTokenModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
