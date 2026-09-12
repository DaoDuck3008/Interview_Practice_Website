import { ConfigService } from '@nestjs/config';
import { OnModuleInit } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  JOB_MOCK_CV_PROFILE,
  PDF_JOBS_QUEUE,
  type MockCvProfileJobData,
} from './ai-jobs.types';
import { MockCvProfileJobHandler } from './handlers/mock-cv-profile-job.handler';

/** Queue riêng để PDF không thể chiếm worker của các tác vụ AI khác. */
@Processor(PDF_JOBS_QUEUE)
export class PdfJobsProcessor extends WorkerHost implements OnModuleInit {
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
