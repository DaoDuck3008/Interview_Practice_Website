import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { SpeechController } from './speech.controller';
import { QuotaModule } from '../quota/quota.module';
import { ConcurrencyModule } from '../../common/concurrency/concurrency.module';

@Module({
  imports: [QuotaModule, ConcurrencyModule],
  providers: [SpeechService],
  controllers: [SpeechController],
  exports: [SpeechService],
})
export class SpeechModule {}
