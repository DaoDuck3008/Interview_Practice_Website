import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  AI_JOBS_QUEUE,
  JOB_IMPROVE,
  JOB_MOCK_CV_PROFILE,
  JOB_MOCK_CV_INTERVIEW_OVERVIEW,
  JOB_MOCK_CV_QUESTION_GENERATION,
  JOB_SCORE,
  type AiJobData,
  type ImproveJobData,
  type MockCvProfileJobData,
  type MockCvInterviewOverviewJobData,
  type MockCvQuestionGenerationJobData,
  type ScoreJobData,
} from './ai-jobs.types';
import { ImproveJobHandler } from './handlers/improve-job.handler';
import { MockCvProfileJobHandler } from './handlers/mock-cv-profile-job.handler';
import { MockCvQuestionGenerationJobHandler } from './handlers/mock-cv-question-generation-job.handler';
import { ScoreJobHandler } from './handlers/score-job.handler';
import { MockCvInterviewOverviewJobHandler } from './handlers/mock-cv-interview-overview-job.handler';

/**
 * Worker mỏng của queue AI: chỉ cấu hình concurrency, log lifecycle và chuyển job
 * đến handler tương ứng. Toàn bộ nghiệp vụ nằm trong thư mục handlers/.
 */
@Processor(AI_JOBS_QUEUE)
export class AiJobsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AiJobsProcessor.name);
  private readonly isDev: boolean;

  constructor(
    private readonly scoreHandler: ScoreJobHandler,
    private readonly improveHandler: ImproveJobHandler,
    private readonly mockCvProfileHandler: MockCvProfileJobHandler,
    private readonly mockCvQuestionHandler: MockCvQuestionGenerationJobHandler,
    private readonly mockCvOverviewHandler: MockCvInterviewOverviewJobHandler,
    private readonly config: ConfigService,
  ) {
    super();
    this.isDev = this.config.get<string>('NODE_ENV') !== 'production';
  }

  onModuleInit() {
    // ConfigService chỉ sẵn sàng sau khi module khởi tạo, nên set concurrency tại đây.
    this.worker.concurrency = this.config.get<number>('aiQueue.concurrency', 5);
  }

  async process(job: Job<AiJobData>): Promise<void> {
    switch (job.name) {
      case JOB_SCORE:
        return this.scoreHandler.process(job as Job<ScoreJobData>);
      case JOB_IMPROVE:
        return this.improveHandler.process(job as Job<ImproveJobData>);
      case JOB_MOCK_CV_PROFILE:
        return this.mockCvProfileHandler.process(
          job as Job<MockCvProfileJobData>,
        );
      case JOB_MOCK_CV_QUESTION_GENERATION:
        return this.mockCvQuestionHandler.process(
          job as Job<MockCvQuestionGenerationJobData>,
        );
      case JOB_MOCK_CV_INTERVIEW_OVERVIEW:
        return this.mockCvOverviewHandler.process(
          job as Job<MockCvInterviewOverviewJobData>,
        );
      default:
        this.logger.warn(`Job name lạ, bỏ qua: ${job.name}`);
    }
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(
      `Lỗi Worker AiJobsProcessor: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job<AiJobData>) {
    if (!this.isDev) return;
    this.logger.debug(`Bắt đầu xử lý job ${job.name} (${job.id})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<AiJobData>) {
    if (!this.isDev) return;
    const durationMs =
      job.finishedOn && job.processedOn
        ? job.finishedOn - job.processedOn
        : undefined;
    this.logger.debug(
      `Xong job ${job.name} (${job.id})${durationMs !== undefined ? ` sau ${durationMs}ms` : ''}`,
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<AiJobData> | undefined) {
    if (!job) return;

    switch (job.name) {
      case JOB_SCORE:
        return this.scoreHandler.onFailed(job as Job<ScoreJobData>);
      case JOB_IMPROVE:
        return this.improveHandler.onFailed(job as Job<ImproveJobData>);
      case JOB_MOCK_CV_PROFILE:
        return this.mockCvProfileHandler.onFailed(
          job as Job<MockCvProfileJobData>,
        );
      case JOB_MOCK_CV_QUESTION_GENERATION:
        return this.mockCvQuestionHandler.onFailed(
          job as Job<MockCvQuestionGenerationJobData>,
        );
      case JOB_MOCK_CV_INTERVIEW_OVERVIEW:
        return this.mockCvOverviewHandler.onFailed(
          job as Job<MockCvInterviewOverviewJobData>,
        );
      default:
        this.logger.error(
          `Job không xác định ${job.name} (${job.id}) thất bại: ${job.failedReason}`,
        );
    }
  }
}
