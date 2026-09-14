import { Module } from '@nestjs/common';
import { ExplanationCreditsController } from './explanation-credits.controller';
import { ExplanationCreditsService } from './explanation-credits.service';

@Module({
  controllers: [ExplanationCreditsController],
  providers: [ExplanationCreditsService],
  exports: [ExplanationCreditsService],
})
export class ExplanationCreditsModule {}
