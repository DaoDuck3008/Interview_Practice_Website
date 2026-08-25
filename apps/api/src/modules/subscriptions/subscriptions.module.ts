import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { MailModule } from '../mail/mail.module';
import { CacheModule } from '../../cache/cache.module';
import { AiCreditsModule } from '../ai-credits/ai-credits.module';

@Module({
  imports: [MailModule, CacheModule, AiCreditsModule],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
