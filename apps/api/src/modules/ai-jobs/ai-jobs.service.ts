import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  AI_JOBS_QUEUE,
  PDF_JOBS_QUEUE,
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
import { ConfigService } from '@nestjs/config';
import { AiCreditFeature } from '@prisma/client';
import { AiCreditsService } from '../ai-credits/ai-credits.service';
import { aiCreditReservationKey } from '../ai-credits/ai-credit-pricing';

// Giữ job lỗi 1 ngày trong tập "failed" của queue để debug, sau đó tự dọn.
const REMOVE_ON_FAIL_AGE_SEC = 24 * 3600;

@Injectable()
export class AiJobsService {
  private readonly logger = new Logger(AiJobsService.name);
  private readonly isDev: boolean;

  constructor(
    @InjectQueue(AI_JOBS_QUEUE) private queue: Queue,
    @InjectQueue(PDF_JOBS_QUEUE) private pdfQueue: Queue,
    private readonly config: ConfigService,
    private readonly aiCredits: AiCreditsService,
  ) {
    this.isDev = this.config.get<string>('NODE_ENV') !== 'production';
    // Lỗi kết nối Redis phía Queue (producer) — khác lỗi job, vd Redis rớt kết nối.
    this.queue.on('error', (err) => {
      this.logger.error(`Lỗi kết nối Redis (BullMQ Queue): ${err.message}`);
    });
  }

  enqueueScore(
    sessionId: string,
    userId: string,
    chargeOverview = true,
  ): Promise<void> {
    const data: ScoreJobData = { sessionId, userId, chargeOverview };
    return this.enqueue(JOB_SCORE, `score_${sessionId}`, data).catch(
      async (error) => {
        try {
          await this.aiCredits.releaseByIdempotencyKey(
            aiCreditReservationKey(
              AiCreditFeature.ANSWER_AUDIO,
              'SESSION',
              sessionId,
            ),
            'Không enqueue được job chấm điểm.',
          );
        } catch (releaseError) {
          this.logger.error(
            `Không release được audio credit sau lỗi enqueue score ${sessionId}: ${releaseError instanceof Error ? releaseError.message : String(releaseError)}`,
          );
        }
        throw error;
      },
    );
  }

  enqueueImprove(sessionId: string, userId: string): Promise<void> {
    const data: ImproveJobData = { sessionId, userId };
    return this.enqueue(JOB_IMPROVE, `improve_${sessionId}`, data);
  }

  enqueueMockCvProfile(
    analysisId: string,
    userId: string,
    attempt: number,
  ): Promise<void> {
    const data: MockCvProfileJobData = { analysisId, userId, attempt };
    // Mỗi attempt có jobId riêng để lần retry mới không bị job cũ đang chạy dedup nhầm.
    return this.enqueueOnQueue(
      this.pdfQueue,
      JOB_MOCK_CV_PROFILE,
      `mock_cv_profile_${analysisId}_${attempt}`,
      data,
    );
  }

  enqueueMockCvQuestionGeneration(
    analysisId: string,
    userId: string,
    attempt: number,
  ): Promise<void> {
    const data: MockCvQuestionGenerationJobData = {
      analysisId,
      userId,
      attempt,
    };
    // Attempt nằm trong jobId để retry mới không bị dedup nhầm với job cũ.
    return this.enqueue(
      JOB_MOCK_CV_QUESTION_GENERATION,
      `mock_cv_questions_${analysisId}_${attempt}`,
      data,
    );
  }

  /** Enqueue tổng hợp kết quả sau khi toàn bộ câu Mock CV đã terminal. */
  enqueueMockCvInterviewOverview(
    mockCvInterviewId: string,
    userId: string,
  ): Promise<void> {
    const data: MockCvInterviewOverviewJobData = {
      mockCvInterviewId,
      userId,
    };
    return this.enqueue(
      JOB_MOCK_CV_INTERVIEW_OVERVIEW,
      `mock_cv_overview_${mockCvInterviewId}`,
      data,
    );
  }

  /** Gỡ các job chưa chạy trước khi admin xóa vĩnh viễn dữ liệu nguồn. */
  async removeJobs(jobIds: string[]): Promise<string[]> {
    const activeJobIds: string[] = [];
    for (const jobId of new Set(jobIds)) {
      const queue = jobId.startsWith('mock_cv_profile_')
        ? this.pdfQueue
        : this.queue;
      const job = await queue.getJob(jobId);
      if (!job) continue;
      const state = await job.getState();
      if (state === 'active') {
        activeJobIds.push(jobId);
        continue;
      }
      try {
        await job.remove();
      } catch (error) {
        const currentState = await job.getState().catch(() => 'unknown');
        if (currentState === 'active') {
          activeJobIds.push(jobId);
          continue;
        }
        throw error;
      }
    }
    return activeJobIds;
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
    data: AiJobData,
  ): Promise<void> {
    return this.enqueueOnQueue(this.queue, jobName, jobId, data);
  }

  private async enqueueOnQueue(
    queue: Queue,
    jobName: string,
    jobId: string,
    data: AiJobData,
  ): Promise<void> {
    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        if (this.isDev) {
          this.logger.debug(`Job ${jobId} đã fail trước đó — xóa để tạo lại`);
        }
        await existing.remove(); // delete failed job
      } else {
        if (this.isDev) {
          this.logger.debug(
            `Job ${jobId} đang ở trạng thái "${state}" — bỏ qua, không add lại (dedup)`,
          );
        }
        return; // đang waiting/active — đúng ý đồ dedup, không add lại
      }
    }

    await queue.add(jobName, data, {
      jobId,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: this.isDev ? false : { age: REMOVE_ON_FAIL_AGE_SEC },
    });

    if (this.isDev) {
      this.logger.debug(`Đã thêm job ${jobName} (${jobId}) vào hàng đợi`);
    }
  }
}
