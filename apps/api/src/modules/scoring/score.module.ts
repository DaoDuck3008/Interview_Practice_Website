import { Module } from '@nestjs/common';
import { DeepSeekClient } from './deepseek.client';
import { ScoringService } from './scoring.service';
import { ImprovementService } from './improvement.service';

@Module({
  providers: [DeepSeekClient, ScoringService, ImprovementService],
  exports: [DeepSeekClient, ScoringService, ImprovementService],
})
export class ScoreModule {}
