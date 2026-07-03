import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScoreModule } from '../scoring/score.module';
import { StorageModule } from '../storage/storage.module';
import { WebsocketModule } from '../../websocket/websocket.module';
import { AiJobsService } from './ai-jobs.service';
import { AiJobsProcessor } from './ai-jobs.processor';
import { AI_JOBS_QUEUE } from './ai-jobs.types';

@Module({
  imports: [
    BullModule.registerQueue({ name: AI_JOBS_QUEUE }),
    ScoreModule,
    StorageModule,
    WebsocketModule,
  ],
  providers: [AiJobsService, AiJobsProcessor],
  exports: [AiJobsService],
})
export class AiJobsModule {}
