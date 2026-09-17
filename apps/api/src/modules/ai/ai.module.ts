import { Module } from '@nestjs/common';
import { DeepSeekClient } from './clients/deepseek.client';
import { DeepSeekTokenBudgetService } from './services/deepseek-token-budget.service';

@Module({
  providers: [DeepSeekClient, DeepSeekTokenBudgetService],
  exports: [DeepSeekClient],
})
export class AiModule {}
