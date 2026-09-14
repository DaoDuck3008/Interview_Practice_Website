import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { ExplanationCreditsModule } from '../explanation-credits/explanation-credits.module';
import { ExplanationsController } from './explanations.controller';
import { ExplanationsService } from './explanations.service';
import { WebsocketModule } from '../../websocket/websocket.module';
import { EXPLANATION_JOBS_QUEUE } from './explanation-jobs.types';
import { ExplanationJobsService } from './explanation-jobs.service';
import { ExplanationJobsProcessor } from './explanation-jobs.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: EXPLANATION_JOBS_QUEUE }),
    AiModule,
    ExplanationCreditsModule,
    WebsocketModule,
  ],
  controllers: [ExplanationsController],
  providers: [
    ExplanationsService,
    ExplanationJobsService,
    ExplanationJobsProcessor,
  ],
})
export class ExplanationsModule {}
