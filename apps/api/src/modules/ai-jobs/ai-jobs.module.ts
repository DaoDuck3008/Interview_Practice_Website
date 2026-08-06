import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScoreModule } from '../scoring/score.module';
import { StorageModule } from '../storage/storage.module';
import { WebsocketModule } from '../../websocket/websocket.module';
import { AiJobsService } from './ai-jobs.service';
import { AiJobsProcessor } from './ai-jobs.processor';
import { AI_JOBS_QUEUE } from './ai-jobs.types';
import { MockCvProfileService } from '../mock-cv-analysis/mock-cv-profile.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: AI_JOBS_QUEUE }),
    ScoreModule,
    StorageModule,
    WebsocketModule,
  ],
  providers: [AiJobsService, AiJobsProcessor, MockCvProfileService],
  exports: [AiJobsService],
})
export class AiJobsModule {}
