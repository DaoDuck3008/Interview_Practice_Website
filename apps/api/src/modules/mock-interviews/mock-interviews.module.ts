import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiJobsModule } from '../ai-jobs/ai-jobs.module';
import { CacheModule } from '../../cache/cache.module';
import { ConcurrencyModule } from '../../common/concurrency/concurrency.module';
import { MockCoreModule } from '../mock-core/mock-core.module';
import { MockCvInterviewsModule } from '../mock-cv-interviews/mock-cv-interviews.module';
import { MockInterviewsController } from './mock-interviews.controller';
import { MockInterviewsService } from './mock-interviews.service';
import { MockInterviewJobsService } from './mock-interview-jobs.service';
import { MockInterviewJobsProcessor } from './mock-interview-jobs.processor';
import { MOCK_INTERVIEW_JOBS_QUEUE } from './mock-interview-jobs.types';

/**
 * Module của Mock Interview thường: ghép controller, domain service và timer worker.
 * Import MockCoreModule để dùng pipeline answer/lock chung, còn ai-jobs phụ trách chấm điểm.
 */
@Module({
  imports: [
    MockCoreModule,
    MockCvInterviewsModule,
    AiJobsModule,
    CacheModule,
    ConcurrencyModule,
    BullModule.registerQueue({ name: MOCK_INTERVIEW_JOBS_QUEUE }),
  ],
  controllers: [MockInterviewsController],
  providers: [
    MockInterviewsService,
    MockInterviewJobsService,
    MockInterviewJobsProcessor,
  ],
  exports: [MockInterviewJobsService],
})
export class MockInterviewsModule {}
