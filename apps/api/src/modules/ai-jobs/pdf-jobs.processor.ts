import { ConfigService } from '@nestjs/config';
import {
  BeforeApplicationShutdown,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  JOB_MOCK_CV_PROFILE,
  PDF_JOBS_QUEUE,
  type MockCvProfileJobData,
} from './ai-jobs.types';
import { MockCvProfileJobHandler } from './handlers/mock-cv-profile-job.handler';
import { pauseWorkerForShutdown } from '../../common/utils/worker-shutdown.util';

/** Queue riêng để PDF không thể chiếm worker của các tác vụ AI khác. */
@Processor(PDF_JOBS_QUEUE)
export class PdfJobsProcessor
  extends WorkerHost
  implements OnModuleInit, BeforeApplicationShutdown
{
  private readonly logger = new Logger(PdfJobsProcessor.name);
  constructor(
    private readonly profileHandler: MockCvProfileJobHandler,
    private readonly config: ConfigService,
  ) {
    super();
  }

  onModuleInit() {
    this.worker.concurrency = this.config.get<number>(
      'pdfQueue.concurrency',
      2,
    );
  }

  async beforeApplicationShutdown() {
    await pauseWorkerForShutdown(
      this.worker,
      PDF_JOBS_QUEUE,
      this.config.getOrThrow<number>('health.gracefulShutdownTimeoutMs'),
      this.logger,
    );
  }

  async process(job: Job<MockCvProfileJobData>): Promise<void> {
    if (job.name === JOB_MOCK_CV_PROFILE)
      return this.profileHandler.process(job);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<MockCvProfileJobData> | undefined) {
    if (job?.name === JOB_MOCK_CV_PROFILE)
      await this.profileHandler.onFailed(job);
  }
}
