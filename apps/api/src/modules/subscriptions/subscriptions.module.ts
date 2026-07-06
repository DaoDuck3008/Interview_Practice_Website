import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { MailModule } from '../mail/mail.module';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [MailModule, CacheModule],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
