import { Module } from '@nestjs/common';
import { AiJobsModule } from '../ai-jobs/ai-jobs.module';
import { MockCvsController } from './mock-cvs.controller';
import { MockCvsService } from './mock-cvs.service';

@Module({
  imports: [AiJobsModule],
  controllers: [MockCvsController],
  providers: [MockCvsService],
})
export class MockCvsModule {}
