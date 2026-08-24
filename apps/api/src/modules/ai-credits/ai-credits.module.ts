import { Module } from '@nestjs/common';
import { AiCreditsController } from './ai-credits.controller';
import { AiCreditsService } from './ai-credits.service';

@Module({
  controllers: [AiCreditsController],
  providers: [AiCreditsService],
  exports: [AiCreditsService],
})
export class AiCreditsModule {}
