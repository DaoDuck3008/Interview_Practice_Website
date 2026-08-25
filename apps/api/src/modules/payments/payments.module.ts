import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SepayClient } from './sepay.client';
import { MailModule } from '../mail/mail.module';
import { AiCreditsModule } from '../ai-credits/ai-credits.module';

@Module({
  imports: [MailModule, AiCreditsModule],
  providers: [PaymentsService, SepayClient],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
