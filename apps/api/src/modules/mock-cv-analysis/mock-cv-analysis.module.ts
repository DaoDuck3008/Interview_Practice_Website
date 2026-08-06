import { Module } from '@nestjs/common';
import { AiJobsModule } from '../ai-jobs/ai-jobs.module';
import { StorageModule } from '../storage/storage.module';
import { MockCvAnalysisController } from './mock-cv-analysis.controller';
import { MockCvAnalysisService } from './mock-cv-analysis.service';

@Module({
  imports: [StorageModule, AiJobsModule],
  controllers: [MockCvAnalysisController],
  providers: [MockCvAnalysisService],
})
export class MockCvAnalysisModule {}
