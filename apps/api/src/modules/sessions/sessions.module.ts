import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { StorageModule } from '../storage/storage.module';
import { SpeechModule } from '../speech/speech.module';
import { ScoreModule } from '../scoring/score.module';

@Module({
  imports: [StorageModule, SpeechModule, ScoreModule],
  providers: [SessionsService],
  controllers: [SessionsController],
})
export class SessionsModule {}
