import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ScoringService } from './scoring.service';
import { ImprovementService } from './improvement.service';

@Module({
  imports: [AiModule],
  providers: [ScoringService, ImprovementService],
  exports: [ScoringService, ImprovementService],
})
export class ScoreModule {}
