import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { StorageModule } from '../storage/storage.module';
import { SpeechModule } from '../speech/speech.module';
import { AiJobsModule } from '../ai-jobs/ai-jobs.module';
import { QuotaModule } from '../quota/quota.module';
import { ConcurrencyModule } from '../../common/concurrency/concurrency.module';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    StorageModule,
    SpeechModule,
    AiJobsModule,
    QuotaModule,
    ConcurrencyModule,
    CacheModule,
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
})
export class SessionsModule {}
