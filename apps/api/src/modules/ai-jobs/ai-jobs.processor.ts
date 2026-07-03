import { HttpException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ScoringService } from '../scoring/scoring.service';
import { ImprovementService } from '../scoring/improvement.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { SCORING_PROMPT_VERSION } from '../scoring/prompts/scoring.prompt';
import {
  deleteSessionAndAudio,
  transientZeroScore,
} from '../sessions/session-score.utils';
import {
  AI_JOBS_QUEUE,
  JOB_IMPROVE,
  JOB_SCORE,
  type ImproveJobData,
  type ScoreJobData,
} from './ai-jobs.types';

const GENERIC_FAILURE_MESSAGE =
  'Đã có lỗi xảy ra, vui lòng thử lại sau ít phút.';

/**
 * Worker xử lý score/improve từ hàng đợi. Không cấu hình `concurrency` ngay
 * trong decorator @Processor — cùng vấn đề timing như CORS ở
 * websocket.adapter.ts: import của app.module.ts chạy xong trước khi
 * ConfigModule.forRoot() bên trong nó thực thi, nên ConfigService chưa có giá
 * trị thật lúc decorator load. Ghi đè `this.worker.concurrency` ở
 * onModuleInit() — lúc đó DI đã sẵn sàng.
 */
@Processor(AI_JOBS_QUEUE)
export class AiJobsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AiJobsProcessor.name);
  // Job id đã được catch trong process() emit failure riêng — @OnWorkerEvent
  // ('failed') sẽ luôn fire thêm sau đó (BullMQ tự bắn khi job ném lỗi), dùng
  // set này để tránh emit trùng (đè message cụ thể bằng message chung chung).
  private readonly notifiedFailures = new Set<string>();

  private readonly isDev: boolean;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private scoring: ScoringService,
    private improvement: ImprovementService,
    private websocket: WebsocketGateway,
    private config: ConfigService,
  ) {
    super();
    this.isDev = this.config.get<string>('NODE_ENV') !== 'production';
  }

  onModuleInit() {
    this.worker.concurrency = this.config.get<number>('aiQueue.concurrency', 3);
  }

  /** Lỗi kết nối/nội bộ của Worker (khác lỗi job) — vd Redis rớt kết nối. */
  @OnWorkerEvent('error')
  onError(err: Error) {
    this.logger.error(`Lỗi Worker AiJobsProcessor: ${err.message}`, err.stack);
  }

  /** Chỉ log dev — theo dõi job bắt đầu/xong để biết queue có tồn đọng không. */
  @OnWorkerEvent('active')
  onActive(job: Job<ScoreJobData | ImproveJobData>) {
    if (!this.isDev) return;
    this.logger.debug(`Bắt đầu xử lý job ${job.name} (${job.id})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ScoreJobData | ImproveJobData>) {
    if (!this.isDev) return;
    const durationMs =
      job.finishedOn && job.processedOn
        ? job.finishedOn - job.processedOn
        : undefined;
    this.logger.debug(
      `Xong job ${job.name} (${job.id})${durationMs !== undefined ? ` sau ${durationMs}ms` : ''}`,
    );
  }

  async process(job: Job<ScoreJobData | ImproveJobData>): Promise<void> {
    switch (job.name) {
      case JOB_SCORE:
        return this.processScore(job as Job<ScoreJobData>);
      case JOB_IMPROVE:
        return this.processImprove(job as Job<ImproveJobData>);
      default:
        this.logger.warn(`Job name lạ, bỏ qua: ${job.name}`);
    }
  }

  private async processScore(job: Job<ScoreJobData>): Promise<void> {
    const { sessionId, userId } = job.data;
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { question: true },
      });
      // Session có thể đã bị xóa (vd điểm 0 ở lần thử trước) — bỏ qua êm.
      if (!session) return;

      const existing = await this.prisma.score.findUnique({
        where: { sessionId },
      });
      if (existing) {
        this.websocket.emitToUser(userId, 'score:ready', {
          sessionId,
          score: existing,
        });
        return;
      }

      const result = await this.scoring.score(session.transcript, {
        content: session.question.content,
        answerKeySummary: session.question.answerKeySummary,
        answerKeywords: session.question.answerKeywords,
      });

      let score: unknown;
      if (
        result.technicalScore +
          result.completenessScore +
          result.clarityScore ===
        0
      ) {
        await deleteSessionAndAudio(
          this.prisma,
          this.storage,
          session.id,
          session.audioUrl,
        );
        score = transientZeroScore(result);
      } else {
        score = await this.createScore(sessionId, result);
      }

      this.websocket.emitToUser(userId, 'score:ready', { sessionId, score });
    } catch (err) {
      this.emitFailure(job.id, userId, sessionId, 'score:failed', err);
      throw err;
    }
  }

  private async processImprove(job: Job<ImproveJobData>): Promise<void> {
    const { sessionId, userId } = job.data;
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { question: true, score: true },
      });
      if (!session || !session.score) return;

      const existing = await this.prisma.improvement.findUnique({
        where: { sessionId },
      });
      if (existing) {
        this.websocket.emitToUser(userId, 'improve:ready', {
          sessionId,
          improvement: existing,
        });
        return;
      }

      const result = await this.improvement.improve(
        session.transcript,
        {
          content: session.question.content,
          answerKeySummary: session.question.answerKeySummary,
          answerKeywords: session.question.answerKeywords,
        },
        {
          technicalScore: session.score.technicalScore,
          completenessScore: session.score.completenessScore,
          clarityScore: session.score.clarityScore,
          overallScore: 0,
          matchedKeywords: session.score.matchedKeywords,
          missedKeywords: session.score.missedKeywords,
          feedback: {
            summary: session.score.summary,
            improvements: session.score.improvements,
          },
          promptVersion: session.score.promptVersion ?? SCORING_PROMPT_VERSION,
        },
      );

      const improvement = await this.createImprovement(sessionId, result);
      this.websocket.emitToUser(userId, 'improve:ready', {
        sessionId,
        improvement,
      });
    } catch (err) {
      this.emitFailure(job.id, userId, sessionId, 'improve:failed', err);
      throw err;
    }
  }

  /**
   * Tạo Score, chịu được race: BullMQ jobId dedup đã chặn 2 job cùng session
   * chạy song song, nhưng vẫn giữ catch P2002 làm lớp phòng thủ DB cuối cùng.
   */
  private async createScore(
    sessionId: string,
    result: Awaited<ReturnType<ScoringService['score']>>,
  ) {
    try {
      return await this.prisma.score.create({
        data: {
          sessionId,
          technicalScore: result.technicalScore,
          completenessScore: result.completenessScore,
          clarityScore: result.clarityScore,
          matchedKeywords: result.matchedKeywords ?? [],
          missedKeywords: result.missedKeywords ?? [],
          summary: result.feedback.summary,
          improvements: result.feedback.improvements ?? [],
          promptVersion: result.promptVersion,
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        const existing = await this.prisma.score.findUnique({
          where: { sessionId },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  private async createImprovement(
    sessionId: string,
    result: Awaited<ReturnType<ImprovementService['improve']>>,
  ) {
    try {
      return await this.prisma.improvement.create({
        data: {
          sessionId,
          improvedAnswer: result.improvedAnswer,
          annotations: result.annotations as unknown as Prisma.InputJsonValue,
          keyChanges: result.keyChanges ?? [],
          promptVersion: result.promptVersion,
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        const existing = await this.prisma.improvement.findUnique({
          where: { sessionId },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === 'P2002'
    );
  }

  private emitFailure(
    jobId: string | undefined,
    userId: string,
    sessionId: string,
    event: 'score:failed' | 'improve:failed',
    err: unknown,
  ) {
    if (jobId) this.notifiedFailures.add(jobId);
    const message =
      err instanceof HttpException ? err.message : GENERIC_FAILURE_MESSAGE;
    const jobKind = event.startsWith('score') ? 'score' : 'improve';
    this.logger.error(
      `Job ${jobKind} thất bại — session ${sessionId}: ${message}`,
      err instanceof Error ? err.stack : undefined,
    );
    this.websocket.emitToUser(userId, event, { sessionId, message });
  }

  /**
   * Lớp phòng hờ cuối: nếu process() crash trước khi kịp catch (lỗi không
   * lường trước, OOM...), vẫn đảm bảo user nhận được 1 thông báo lỗi thay vì
   * bị treo mãi ở trạng thái "đang xử lý". Bỏ qua nếu catch trong process() đã
   * tự emit rồi (tránh báo lỗi trùng, đè mất message cụ thể).
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<ScoreJobData | ImproveJobData> | undefined) {
    if (!job?.id) return;
    if (this.notifiedFailures.delete(job.id)) return;

    const event = job.name === JOB_SCORE ? 'score:failed' : 'improve:failed';
    this.logger.error(
      `Job ${job.name} (${job.id}) thất bại: ${job.failedReason}`,
    );
    this.websocket.emitToUser(job.data.userId, event, {
      sessionId: job.data.sessionId,
      message: GENERIC_FAILURE_MESSAGE,
    });
  }
}
