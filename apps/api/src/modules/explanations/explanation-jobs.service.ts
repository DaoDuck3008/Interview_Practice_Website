import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  EXPLANATION_JOBS_QUEUE,
  GenerateTechnicalTermJob,
  JOB_GENERATE_TECHNICAL_TERM,
} from './explanation-jobs.types';

@Injectable()
export class ExplanationJobsService {
  constructor(
    @InjectQueue(EXPLANATION_JOBS_QUEUE)
    private readonly queue: Queue<GenerateTechnicalTermJob>,
  ) {}

  /** jobId theo term biến hàng đợi thành distributed dedup cho mọi request cùng thuật ngữ. */
  async enqueue(data: GenerateTechnicalTermJob) {
    // BullMQ cấm dấu ':' trong custom jobId vì nó dùng ký tự này làm namespace nội bộ.
    const jobId = `explanation_${data.termId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) return;
    await this.queue.add(JOB_GENERATE_TECHNICAL_TERM, data, {
      jobId,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: { age: 24 * 3600 },
    });
  }
}
