import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SepayClient } from './sepay.client';

@Module({
  providers: [PaymentsService, SepayClient],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
