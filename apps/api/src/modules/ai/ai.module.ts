import { Module } from '@nestjs/common';
import { DeepSeekClient } from './clients/deepseek.client';

@Module({
  providers: [DeepSeekClient],
  exports: [DeepSeekClient],
})
export class AiModule {}
