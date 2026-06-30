import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { StorageModule } from '../storage/storage.module';
import { SpeechModule } from '../speech/speech.module';
import { ScoreModule } from '../scoring/score.module';
import { QuotaModule } from '../quota/quota.module';
import { ConcurrencyModule } from '../../common/concurrency/concurrency.module';

@Module({
  imports: [
    StorageModule,
    SpeechModule,
    ScoreModule,
    QuotaModule,
    ConcurrencyModule,
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
})
export class SessionsModule {}
