import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { SpeechController } from './speech.controller';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [QuotaModule],
  providers: [SpeechService],
  controllers: [SpeechController],
  exports: [SpeechService],
})
export class SpeechModule {}
