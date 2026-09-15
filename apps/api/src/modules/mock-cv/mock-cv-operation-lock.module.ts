import { Module } from '@nestjs/common';
import { MockCvOperationLockService } from './mock-cv-operation-lock.service';

@Module({
  providers: [MockCvOperationLockService],
  exports: [MockCvOperationLockService],
})
export class MockCvOperationLockModule {}
