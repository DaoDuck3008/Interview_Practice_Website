import { Module } from '@nestjs/common';
import { AiCreditsModule } from '../ai-credits/ai-credits.module';
import { SpeechModule } from '../speech/speech.module';
import { StorageModule } from '../storage/storage.module';
import { MockAnswerLockService } from './services/mock-answer-lock.service';
import { MockAnswerMediaService } from './services/mock-answer-media.service';

/**
 * Vai trò: đóng gói các service hạ tầng dùng chung cho Mock Interview và Mock CV Interview.
 * Module dùng AI Credits/Speech/Storage, export answer media + Redis lock; được import bởi
 * MockInterviewsModule và MockCvInterviewsModule.
 */
@Module({
  imports: [AiCreditsModule, SpeechModule, StorageModule],
  providers: [MockAnswerLockService, MockAnswerMediaService],
  exports: [MockAnswerLockService, MockAnswerMediaService],
})
export class MockCoreModule {}
