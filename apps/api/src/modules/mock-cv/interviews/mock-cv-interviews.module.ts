import { Module } from '@nestjs/common';
import { CacheModule } from '../../../cache/cache.module';
import { ConcurrencyModule } from '../../../common/concurrency/concurrency.module';
import { AiJobsModule } from '../../ai-jobs/ai-jobs.module';
import { MockCoreModule } from '../../mock-core/mock-core.module';
import { MockCvInterviewsController } from './mock-cv-interviews.controller';
import { MockCvInterviewsService } from './mock-cv-interviews.service';
import { AiCreditsModule } from '../../ai-credits/ai-credits.module';

/**
 * Module domain của các lần làm Mock CV Interview.
 * Dùng mock-core cho answer pipeline, ai-jobs cho scoring; export service để timer worker gọi auto-submit/recovery.
 */
@Module({
  imports: [
    MockCoreModule,
    AiJobsModule,
    CacheModule,
    ConcurrencyModule,
    AiCreditsModule,
  ],
  controllers: [MockCvInterviewsController],
  providers: [MockCvInterviewsService],
  exports: [MockCvInterviewsService],
})
export class MockCvInterviewsModule {}
