import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  JOB_AUTO_SUBMIT_EXPIRED_MOCK,
  JOB_RECOVER_EXPIRED_MOCKS,
  MOCK_INTERVIEW_JOBS_QUEUE,
  type AutoSubmitExpiredMockJobData,
  type MockInterviewJobData,
} from './mock-interview-jobs.types';
import {
  MOCK_ANSWER_GRACE_MS,
  MOCK_AUTO_SUBMIT_BUFFER_MS,
  MOCK_EXPIRED_RECOVERY_INTERVAL_MS,
} from '../mock-core/mock-core.constants';

const REMOVE_ON_FAIL_AGE_SEC = 24 * 3600;

/**
 * Producer/scheduler của timer queue: tạo delayed auto-submit và lịch recovery.
 * Dùng constants từ mock-core; được MockInterviewsService và
 * MockInterviewJobsProcessor gọi, sau này sẽ mở rộng cho Mock CV Interview.
 */
@Injectable()
export class MockInterviewJobsService implements OnModuleInit {
  private readonly logger = new Logger(MockInterviewJobsService.name);

  constructor(
    @InjectQueue(MOCK_INTERVIEW_JOBS_QUEUE)
    private readonly queue: Queue<MockInterviewJobData>,
  ) {
    this.queue.on('error', (err) => {
      this.logger.error(
        `Lỗi kết nối Redis (MockInterview queue): ${err.message}`,
      );
    });
  }

  async onModuleInit() {
    // Job Scheduler được lưu trong Redis nên nhiều instance cùng khởi động vẫn dùng chung một lịch recovery.
    await this.queue.upsertJobScheduler(
      JOB_RECOVER_EXPIRED_MOCKS,
      { every: MOCK_EXPIRED_RECOVERY_INTERVAL_MS },
      {
        name: JOB_RECOVER_EXPIRED_MOCKS,
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: true,
          removeOnFail: { age: REMOVE_ON_FAIL_AGE_SEC },
        },
      },
    );
    this.logger.log('Đã đăng ký Job Scheduler recovery mock interview hết hạn.');
  }

  async enqueueAutoSubmit(
    mockInterviewId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const jobId = `expire_mock_${mockInterviewId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.remove();
      } else {
        this.logger.debug(
          `Bỏ qua delayed job mock ${mockInterviewId}: job ${jobId} đang ở trạng thái ${state}.`,
        );
        return false;
      }
    }

    // Không chốt ngay tại expiresAt: cần chờ hết grace window để không bỏ sót audio cuối đang commit.
    const delay = Math.max(
      0,
      expiresAt.getTime() +
        MOCK_ANSWER_GRACE_MS +
        MOCK_AUTO_SUBMIT_BUFFER_MS -
        Date.now(),
    );
    const data: AutoSubmitExpiredMockJobData = { mockInterviewId, userId };

    await this.queue.add(JOB_AUTO_SUBMIT_EXPIRED_MOCK, data, {
      jobId,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: true,
      removeOnFail: { age: REMOVE_ON_FAIL_AGE_SEC },
    });
    this.logger.log(
      `Đã tạo delayed job tự nộp mock ${mockInterviewId}, chạy sau ${delay}ms.`,
    );
    return true;
  }
}
