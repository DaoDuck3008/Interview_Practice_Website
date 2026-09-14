import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { ExplanationsService } from './explanations.service';
import {
  EXPLANATION_JOBS_QUEUE,
  GenerateTechnicalTermJob,
} from './explanation-jobs.types';

@Processor(EXPLANATION_JOBS_QUEUE, { concurrency: 5 })
export class ExplanationJobsProcessor extends WorkerHost {
  constructor(
    private readonly explanations: ExplanationsService,
    private readonly websocket: WebsocketGateway,
  ) {
    super();
  }

  /** Worker ghi DB trước rồi mới emit, nên client reconnect vẫn có thể poll source of truth. */
  async process(job: Job<GenerateTechnicalTermJob>) {
    try {
      const result = await this.explanations.generateInWorker(job.data);
      this.websocket.emitToUser(job.data.userId, 'explanation:ready', {
        termId: job.data.termId,
        ...result,
      });
    } catch (error) {
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
