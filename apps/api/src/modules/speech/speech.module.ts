import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { SpeechController } from './speech.controller';

@Module({
  providers: [SpeechService],
  controllers: [SpeechController],
  exports: [SpeechService],
})
export class SpeechModule {}
