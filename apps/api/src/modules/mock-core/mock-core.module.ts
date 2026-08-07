import { Module } from '@nestjs/common';
import { QuotaModule } from '../quota/quota.module';
import { SpeechModule } from '../speech/speech.module';
import { StorageModule } from '../storage/storage.module';
import { MockAnswerLockService } from './services/mock-answer-lock.service';
import { MockAnswerMediaService } from './services/mock-answer-media.service';

/**
 * Vai trò: đóng gói các service hạ tầng dùng chung cho Mock Interview và Mock CV Interview.
 * Module dùng Quota/Speech/Storage, export answer media + Redis lock; hiện được import bởi
 * MockInterviewsModule và sẽ được MockCvInterviewsModule import ở giai đoạn kế tiếp.
 */
@Module({
  imports: [QuotaModule, SpeechModule, StorageModule],
  providers: [MockAnswerLockService, MockAnswerMediaService],
  exports: [MockAnswerLockService, MockAnswerMediaService],
})
export class MockCoreModule {}
