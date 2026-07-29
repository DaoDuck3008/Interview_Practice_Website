import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StorageModule } from '../storage/storage.module';
import { SpeechModule } from '../speech/speech.module';
import { QuotaModule } from '../quota/quota.module';
import { AiJobsModule } from '../ai-jobs/ai-jobs.module';
import { CacheModule } from '../../cache/cache.module';
import { RedisModule } from '../../redis/redis.module';
import { ConcurrencyModule } from '../../common/concurrency/concurrency.module';
import { MockInterviewsController } from './mock-interviews.controller';
import { MockInterviewsService } from './mock-interviews.service';
import { MockInterviewJobsService } from './mock-interview-jobs.service';
import { MockInterviewJobsProcessor } from './mock-interview-jobs.processor';
import { MOCK_INTERVIEW_JOBS_QUEUE } from './mock-interview-jobs.types';

@Module({
  imports: [
    StorageModule,
    SpeechModule,
    QuotaModule,
    AiJobsModule,
    CacheModule,
    RedisModule,
    ConcurrencyModule,
    BullModule.registerQueue({ name: MOCK_INTERVIEW_JOBS_QUEUE }),
  ],
  controllers: [MockInterviewsController],
  providers: [
    MockInterviewsService,
    MockInterviewJobsService,
    MockInterviewJobsProcessor,
  ],
})
export class MockInterviewsModule {}
