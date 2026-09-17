import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AI_JOBS_QUEUE } from '../ai-jobs/ai-jobs.types';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [BullModule.registerQueue({ name: AI_JOBS_QUEUE })],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
