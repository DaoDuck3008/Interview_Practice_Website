import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { ScoreModule } from '../scoring/score.module';
import { StorageModule } from '../storage/storage.module';
import { WebsocketModule } from '../../websocket/websocket.module';
import { AiJobsService } from './ai-jobs.service';
import { AiJobsProcessor } from './ai-jobs.processor';
import { AI_JOBS_QUEUE } from './ai-jobs.types';
import { MockCvProfileService } from '../mock-cv/analysis/mock-cv-profile.service';
import { MockCvQuestionGenerationService } from '../mock-cv/analysis/mock-cv-question-generation.service';
import { ImproveJobHandler } from './handlers/improve-job.handler';
import { MockCvProfileJobHandler } from './handlers/mock-cv-profile-job.handler';
import { MockCvQuestionGenerationJobHandler } from './handlers/mock-cv-question-generation-job.handler';
import { MockInterviewScoringService } from './services/mock-interview-scoring.service';
import { ScoreJobHandler } from './handlers/score-job.handler';
import { MockCvQuestionBankService } from './services/mock-cv-question-bank.service';
import { MockCvInterviewOverviewService } from '../mock-cv/analysis/mock-cv-interview-overview.service';
import { MockCvInterviewOverviewJobHandler } from './handlers/mock-cv-interview-overview-job.handler';
import { MockCvInterviewScoringService } from './services/mock-cv-interview-scoring.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: AI_JOBS_QUEUE }),
    AiModule,
    ScoreModule,
    StorageModule,
    WebsocketModule,
  ],
  providers: [
    AiJobsService,
    AiJobsProcessor,
    MockCvProfileService,
    MockCvQuestionGenerationService,
    MockCvInterviewOverviewService,
    ScoreJobHandler,
    ImproveJobHandler,
    MockCvProfileJobHandler,
    MockCvQuestionGenerationJobHandler,
    MockCvInterviewOverviewJobHandler,
    MockInterviewScoringService,
    MockCvInterviewScoringService,
    MockCvQuestionBankService,
  ],
  exports: [AiJobsService],
})
export class AiJobsModule {}
