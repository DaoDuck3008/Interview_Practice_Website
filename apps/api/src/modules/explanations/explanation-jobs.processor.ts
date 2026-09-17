import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BeforeApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { ExplanationsService } from './explanations.service';
import {
  EXPLANATION_JOBS_QUEUE,
  GenerateTechnicalTermJob,
} from './explanation-jobs.types';
import { pauseWorkerForShutdown } from '../../common/utils/worker-shutdown.util';

@Processor(EXPLANATION_JOBS_QUEUE, { concurrency: 5 })
export class ExplanationJobsProcessor
  extends WorkerHost
  implements BeforeApplicationShutdown
{
  private readonly logger = new Logger(ExplanationJobsProcessor.name);

  constructor(
    private readonly explanations: ExplanationsService,
    private readonly websocket: WebsocketGateway,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async beforeApplicationShutdown() {
    await pauseWorkerForShutdown(
      this.worker,
      EXPLANATION_JOBS_QUEUE,
      this.config.getOrThrow<number>('health.gracefulShutdownTimeoutMs'),
      this.logger,
    );
  }

  /** Worker ghi DB trước rồi mới emit, nên client reconnect vẫn có thể poll source of truth. */
  async process(job: Job<GenerateTechnicalTermJob>) {
    try {
      const result = await this.explanations.generateInWorker(job.data);
      this.websocket.emitToUser(job.data.userId, 'explanation:ready', {
        termId: job.data.termId,
        ...result,
      });
    } catch {
      const status = await this.explanations
        .getStatus(job.data.termId)
        .catch(() => null);
      // Timeout không rõ provider đã xử lý chưa vẫn là PENDING; để polling/recovery quyết định sau.
      if (status && 'status' in status && status.status === 'FAILED') {
        this.websocket.emitToUser(job.data.userId, 'explanation:failed', {
          termId: job.data.termId,
          message: 'Không thể tạo giải thích. Vui lòng thử lại sau.',
        });
      }
    }
  }
}
