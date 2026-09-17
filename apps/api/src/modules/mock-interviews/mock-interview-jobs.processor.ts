import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import {
  JOB_AUTO_SUBMIT_EXPIRED_MOCK,
  JOB_AUTO_SUBMIT_EXPIRED_MOCK_CV,
  JOB_RECOVER_EXPIRED_MOCKS,
  MOCK_INTERVIEW_JOBS_QUEUE,
  type AutoSubmitExpiredMockCvJobData,
  type AutoSubmitExpiredMockJobData,
  type MockInterviewJobData,
} from './mock-interview-jobs.types';
import { MockInterviewJobsService } from './mock-interview-jobs.service';
import { MockInterviewsService } from './mock-interviews.service';
import { MockCvInterviewsService } from '../mock-cv/interviews/mock-cv-interviews.service';
import { pauseWorkerForShutdown } from '../../common/utils/worker-shutdown.util';

/*
 * Queue này tách khỏi ai-jobs để việc auto-submit không bị chậm bởi các job chấm điểm.
 * JOB_AUTO_SUBMIT_EXPIRED_MOCK chốt một mock sau grace window; JOB_RECOVER_EXPIRED_MOCKS
 * chỉ tìm các job bị thiếu rồi enqueue lại job auto-submit tương ứng.
 */
@Processor(MOCK_INTERVIEW_JOBS_QUEUE, { concurrency: 5 })
@Injectable()
export class MockInterviewJobsProcessor
  extends WorkerHost
  implements BeforeApplicationShutdown
{
  private readonly logger = new Logger(MockInterviewJobsProcessor.name);

  constructor(
    private readonly mockInterviews: MockInterviewsService,
    private readonly mockCvInterviews: MockCvInterviewsService,
    private readonly jobs: MockInterviewJobsService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async beforeApplicationShutdown() {
    await pauseWorkerForShutdown(
      this.worker,
      MOCK_INTERVIEW_JOBS_QUEUE,
      this.config.getOrThrow<number>('health.gracefulShutdownTimeoutMs'),
      this.logger,
    );
  }

  async process(job: Job<MockInterviewJobData>): Promise<void> {
    switch (job.name) {
      case JOB_AUTO_SUBMIT_EXPIRED_MOCK: {
        const data = job.data as AutoSubmitExpiredMockJobData;
        await this.mockInterviews.autoSubmitExpired(
          data.mockInterviewId,
          data.userId,
        );
        return;
      }
      case JOB_AUTO_SUBMIT_EXPIRED_MOCK_CV: {
        const data = job.data as AutoSubmitExpiredMockCvJobData;
        await this.mockCvInterviews.autoSubmitExpired(
          data.mockCvInterviewId,
          data.userId,
        );
        return;
      }
      case JOB_RECOVER_EXPIRED_MOCKS:
        // Recovery chỉ enqueue lại; việc chốt bài vẫn đi qua delayed job và submit() dùng chung lock.
        await this.recoverExpiredMocks();
        return;
      default:
        this.logger.warn(`Job name lạ, bỏ qua: ${job.name}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<MockInterviewJobData>) {
    this.logger.debug(`Job ${job.name} (${job.id}) đã hoàn tất.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MockInterviewJobData> | undefined) {
    if (!job) return;
    this.logger.error(
      `Job ${job.name} (${job.id}) thất bại: ${job.failedReason ?? 'Không rõ nguyên nhân'}.`,
    );
  }

  private async recoverExpiredMocks() {
    const [mocks, mockCvs] = await Promise.all([
      this.mockInterviews.findExpiredForAutoSubmit(),
      this.mockCvInterviews.findExpiredForAutoSubmit(),
    ]);
    this.logger.log(
      `Recovery tìm thấy ${mocks.length} mock thường và ${mockCvs.length} Mock CV hết hạn.`,
    );
    const [enqueued, enqueuedCv] = await Promise.all([
      Promise.all(
        mocks.map((mock) =>
          this.jobs.enqueueAutoSubmit(mock.id, mock.userId, mock.expiresAt),
        ),
      ),
      Promise.all(
        mockCvs.map((mock) =>
          this.jobs.enqueueMockCvAutoSubmit(
            mock.id,
            mock.userId,
            mock.expiresAt,
          ),
        ),
      ),
    ]);
    this.logger.log(
      `Recovery đã tạo lại ${enqueued.filter(Boolean).length}/${mocks.length} mock thường và ${enqueuedCv.filter(Boolean).length}/${mockCvs.length} Mock CV.`,
    );
  }
}
