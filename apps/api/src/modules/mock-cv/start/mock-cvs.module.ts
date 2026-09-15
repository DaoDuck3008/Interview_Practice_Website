import { Module } from '@nestjs/common';
import { AiJobsModule } from '../../ai-jobs/ai-jobs.module';
import { MockInterviewsModule } from '../../mock-interviews/mock-interviews.module';
import { MockCvsController } from './mock-cvs.controller';
import { MockCvsService } from './mock-cvs.service';
import { MockCvOperationLockModule } from '../mock-cv-operation-lock.module';

@Module({
  imports: [AiJobsModule, MockInterviewsModule, MockCvOperationLockModule],
  controllers: [MockCvsController],
  providers: [MockCvsService],
})
export class MockCvsModule {}
