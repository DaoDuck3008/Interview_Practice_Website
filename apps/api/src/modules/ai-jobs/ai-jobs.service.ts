import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  AI_JOBS_QUEUE,
  JOB_IMPROVE,
  JOB_SCORE,
  type ImproveJobData,
  type ScoreJobData,
} from './ai-jobs.types';
import { ConfigService } from '@nestjs/config';

// Giữ job lỗi 1 ngày trong tập "failed" của queue để debug, sau đó tự dọn.
const REMOVE_ON_FAIL_AGE_SEC = 24 * 3600;

@Injectable()
export class AiJobsService {
  constructor(
    @InjectQueue(AI_JOBS_QUEUE) private queue: Queue,
    private readonly config: ConfigService,
  ) {}

  enqueueScore(sessionId: string, userId: string): Promise<void> {
    const data: ScoreJobData = { sessionId, userId };
    return this.enqueue(JOB_SCORE, `score_${sessionId}`, data);
  }

  enqueueImprove(sessionId: string, userId: string): Promise<void> {
    const data: ImproveJobData = { sessionId, userId };
    return this.enqueue(JOB_IMPROVE, `improve_${sessionId}`, data);
  }

  /**
   * `jobId` cố định theo session là cơ chế dedup chính: 2 request cùng lúc chỉ
   * tạo được 1 job thật. Nhưng nếu job trước đó đã FAIL (hết attempts), nó vẫn
   * nằm trong tập "failed" của queue tới khi hết hạn removeOnFail — gọi
   * `queue.add()` lại với cùng jobId lúc đó sẽ bị BullMQ âm thầm bỏ qua (trả về
   * job cũ đã fail, không chạy lại), khiến nút "thử lại" của user trông như
   * hoạt động nhưng thực chất không làm gì. Nên phải tự dọn job fail cũ trước.
   */
  private async enqueue(
    jobName: string,
    jobId: string,
    data: ScoreJobData | ImproveJobData,
  ): Promise<void> {
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.remove(); // delete failed job
      } else {
        return; // đang waiting/active — đúng ý đồ dedup, không add lại
      }
    }

    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    await this.queue.add(jobName, data, {
      jobId,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: isProd ? { age: REMOVE_ON_FAIL_AGE_SEC } : false,
    });
  }
}
