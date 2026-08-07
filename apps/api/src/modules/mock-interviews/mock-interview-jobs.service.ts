import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  JOB_AUTO_SUBMIT_EXPIRED_MOCK,
  JOB_AUTO_SUBMIT_EXPIRED_MOCK_CV,
  JOB_RECOVER_EXPIRED_MOCKS,
  MOCK_INTERVIEW_JOBS_QUEUE,
  type AutoSubmitExpiredMockCvJobData,
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
 * Dùng constants từ mock-core; được MockInterviewsService, MockCvsService và
 * MockInterviewJobsProcessor gọi cho cả Mock Interview thường lẫn Mock CV.
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
    const data: AutoSubmitExpiredMockJobData = { mockInterviewId, userId };
    return this.enqueueDelayedAutoSubmit({
      jobName: JOB_AUTO_SUBMIT_EXPIRED_MOCK,
      jobId: `expire_mock_${mockInterviewId}`,
      data,
      expiresAt,
      logLabel: `mock ${mockInterviewId}`,
    });
  }

  /** Tạo delayed job cho Mock CV Interview nhưng dùng chung queue/grace/retry với mock thường. */
  enqueueMockCvAutoSubmit(
    mockCvInterviewId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const data: AutoSubmitExpiredMockCvJobData = {
      mockCvInterviewId,
      userId,
    };
    return this.enqueueDelayedAutoSubmit({
      jobName: JOB_AUTO_SUBMIT_EXPIRED_MOCK_CV,
      jobId: `expire_mock_cv_${mockCvInterviewId}`,
      data,
      expiresAt,
      logLabel: `Mock CV ${mockCvInterviewId}`,
    });
  }

  /** Hàm dùng chung tạo job idempotent, tính delay sau grace window và cấu hình retry. */
  private async enqueueDelayedAutoSubmit(input: {
    jobName: string;
    jobId: string;
    data: MockInterviewJobData;
    expiresAt: Date;
    logLabel: string;
  }): Promise<boolean> {
    const { jobId } = input;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.remove();
      } else {
        this.logger.debug(
          `Bỏ qua delayed job ${input.logLabel}: job ${jobId} đang ở trạng thái ${state}.`,
        );
        return false;
      }
    }

    // Không chốt ngay tại expiresAt: cần chờ hết grace window để không bỏ sót audio cuối đang commit.
    const delay = Math.max(
      0,
      input.expiresAt.getTime() +
        MOCK_ANSWER_GRACE_MS +
        MOCK_AUTO_SUBMIT_BUFFER_MS -
        Date.now(),
    );
    await this.queue.add(input.jobName, input.data, {
      jobId,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: true,
      removeOnFail: { age: REMOVE_ON_FAIL_AGE_SEC },
    });
    this.logger.log(
      `Đã tạo delayed job tự nộp ${input.logLabel}, chạy sau ${delay}ms.`,
    );
    return true;
  }
}
