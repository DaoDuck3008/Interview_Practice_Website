import { Module } from '@nestjs/common';
import { AiJobsModule } from '../../ai-jobs/ai-jobs.module';
import { StorageModule } from '../../storage/storage.module';
import { MockCvAnalysisController } from './mock-cv-analysis.controller';
import { MockCvAnalysisService } from './mock-cv-analysis.service';
import { MockCvAdminService } from './mock-cv-admin.service';
import { MockCvInterviewsModule } from '../interviews/mock-cv-interviews.module';
import { MockInterviewsModule } from '../../mock-interviews/mock-interviews.module';
import { CacheModule } from '../../../cache/cache.module';

@Module({
  imports: [
    StorageModule,
    AiJobsModule,
    MockCvInterviewsModule,
    MockInterviewsModule,
    CacheModule,
  ],
  controllers: [MockCvAnalysisController],
  providers: [MockCvAnalysisService, MockCvAdminService],
})
export class MockCvAnalysisModule {}
