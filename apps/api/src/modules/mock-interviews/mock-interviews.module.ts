import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SpeechModule } from '../speech/speech.module';
import { QuotaModule } from '../quota/quota.module';
import { AiJobsModule } from '../ai-jobs/ai-jobs.module';
import { CacheModule } from '../../cache/cache.module';
import { RedisModule } from '../../redis/redis.module';
import { ConcurrencyModule } from '../../common/concurrency/concurrency.module';
import { MockInterviewsController } from './mock-interviews.controller';
import { MockInterviewsService } from './mock-interviews.service';

@Module({
  imports: [
    StorageModule,
    SpeechModule,
    QuotaModule,
    AiJobsModule,
    CacheModule,
    RedisModule,
    ConcurrencyModule,
  ],
  controllers: [MockInterviewsController],
  providers: [MockInterviewsService],
})
export class MockInterviewsModule {}
