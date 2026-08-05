import {
  HttpException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionScoreStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ScoringService } from '../scoring/scoring.service';
import { ImprovementService } from '../scoring/improvement.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { SCORING_PROMPT_VERSION } from '../scoring/prompts/scoring.prompt';
import type { MockInterviewOverviewInput } from '../scoring/prompts/mock-interview-overview.prompt';
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
        include: {
          question: true,
          mockInterviewQuestion: true,
          mockCvInterviewQuestion: true,
        },
      });
      // Session có thể đã bị xóa (vd điểm 0 ở lần thử trước) — báo lỗi thay vì
      // im lặng, để frontend không phải đợi hết JOB_WAIT_TIMEOUT_MS mới biết.
      if (!session) {
        await this.markMockScoreFailure(
          sessionId,
          new NotFoundException('Session không tồn tại (có thể đã bị xóa).'),
        );
        this.emitFailure(
          job.id,
          userId,
          sessionId,
          'score:failed',
          new NotFoundException('Session không tồn tại (có thể đã bị xóa).'),
        );
        return;
      }

      const existing = await this.prisma.score.findUnique({
        where: { sessionId },
      });
      if (existing) {
        await this.markMockScoreSuccess(sessionId);
        this.websocket.emitToUser(userId, 'score:ready', {
          sessionId,
          score: existing,
        });
        return;
      }

      // Session luyện tập thường lấy đáp án từ Question; câu AI của Mock CV chỉ
      // có snapshot trong MockCvInterviewQuestion để không làm bẩn question bank.
      const question = session.question ?? session.mockCvInterviewQuestion;
      if (!question) {
        throw new NotFoundException(
          'Không tìm thấy dữ liệu câu hỏi dùng để chấm Session.',
        );
      }

      const result = session.transcript.trim()
        ? await this.scoring.score(session.transcript, {
            content: question.content,
            answerKeySummary: question.answerKeySummary,
            answerKeywords: question.answerKeywords,
          })
        : {
            technicalScore: 0,
            completenessScore: 0,
            clarityScore: 0,
            overallScore: 0,
            matchedKeywords: [],
            missedKeywords: question.answerKeywords,
            feedback: {
              summary:
                'Mình chưa nghe được câu trả lời nào. Bạn thử ghi âm lại và trả lời câu hỏi nhé!',
              improvements: [],
            },
            promptVersion: SCORING_PROMPT_VERSION,
          };

      let score: unknown;
      if (
        result.technicalScore +
          result.completenessScore +
          result.clarityScore ===
          0 &&
        !session.mockInterviewQuestion &&
        !session.mockCvInterviewQuestion
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

      await this.markMockScoreSuccess(sessionId);
      this.websocket.emitToUser(userId, 'score:ready', { sessionId, score });
    } catch (err) {
      await this.markMockScoreFailure(sessionId, err);
      this.emitFailure(job.id, userId, sessionId, 'score:failed', err);
      throw err;
    }
  }

  private async processImprove(job: Job<ImproveJobData>): Promise<void> {
    const { sessionId, userId } = job.data;
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          question: true,
          score: true,
          mockCvInterviewQuestion: true,
        },
      });
      if (!session || !session.score) {
        this.emitFailure(
          job.id,
          userId,
          sessionId,
          'improve:failed',
          new NotFoundException(
            'Session hoặc điểm chấm không tồn tại (có thể đã bị xóa).',
          ),
        );
        return;
      }

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

      // Improvement phải dùng cùng snapshot câu hỏi đã dùng khi chấm điểm.
      const question = session.question ?? session.mockCvInterviewQuestion;
      if (!question) {
        throw new NotFoundException(
          'Không tìm thấy dữ liệu câu hỏi dùng để cải thiện câu trả lời.',
        );
      }

      const result = await this.improvement.improve(
        session.transcript,
        {
          content: question.content,
          answerKeySummary: question.answerKeySummary,
          answerKeywords: question.answerKeywords,
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

  // Tạo bản ghi Improvement, chịu được race: Bull
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

  // Đánh dấu session đã được chấm thành công, và nếu tất cả câu trong mock interview đã chấm xong thì tổng hợp overview.
  private async markMockScoreSuccess(sessionId: string) {
    const item = await this.prisma.mockInterviewQuestion.findUnique({
      where: { sessionId },
      select: { mockInterviewId: true },
    });
    if (!item) return;

    await this.prisma.mockInterviewQuestion.update({
      where: { sessionId },
      data: { scoreStatus: MockQuestionScoreStatus.SCORED, scoreError: null },
    });

    // Kiểm tra xem tất cả câu đã được chấm xong chưa, nếu xong thì tổng hợp overview.
    await this.completeMockInterviewIfReady(item.mockInterviewId);
  }

  // Đánh dấu session chấm thất bại, và nếu tất cả câu trong mock interview đã chấm xong thì tổng hợp overview.
  private async markMockScoreFailure(sessionId: string, err: unknown) {
    const item = await this.prisma.mockInterviewQuestion.findUnique({
      where: { sessionId },
      select: { mockInterviewId: true },
    });
    if (!item) return;

    await this.prisma.mockInterviewQuestion.update({
      where: { sessionId },
      data: {
        scoreStatus: MockQuestionScoreStatus.FAILED,
        scoreError: this.messageFromError(err),
      },
    });
    await this.completeMockInterviewIfReady(item.mockInterviewId);
  }

  // Được gọi bởi markMockScoreSuccess/Failure() khi tất cả câu đã được chấm xong, để tổng hợp overview.
  private async completeMockInterviewIfReady(mockInterviewId: string) {
    const mock = await this.prisma.mockInterview.findUnique({
      where: { id: mockInterviewId },
      include: {
        topicLinks: {
          orderBy: { order: 'asc' },
          include: { topic: { select: { name: true } } },
        },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: { select: { content: true } },
            session: { include: { score: true } },
          },
        },
      },
    });
    if (!mock || mock.status !== MockInterviewStatus.SCORING) return;

    const terminalStatuses = new Set<MockQuestionScoreStatus>([
      MockQuestionScoreStatus.SCORED,
      MockQuestionScoreStatus.FAILED,
      MockQuestionScoreStatus.SKIPPED,
    ]);

    // Nếu còn câu nào chưa chấm xong (khác SCORED, FAILED, SKIPPED), chưa tổng hợp overview.
    if (mock.questions.some((q) => !terminalStatuses.has(q.scoreStatus))) {
      return;
    }

    // Lock mock interview bằng cách đổi status thành SUBMITTED để tránh race: 2 job
    const lock = await this.prisma.mockInterview.updateMany({
      where: { id: mockInterviewId, status: MockInterviewStatus.SCORING },
      data: { status: MockInterviewStatus.SUBMITTED },
    });
    if (lock.count === 0) return;

    // Lọc ra các câu được chấm thành công (SCORED) để tổng hợp overview. Nếu không có câu nào được chấm thành công, fallback.
    const scored = mock.questions.filter((q) => q.session?.score);
    if (scored.length === 0) {
      await this.prisma.mockInterview.update({
        where: { id: mockInterviewId },
        data: {
          status: MockInterviewStatus.SCORED,
          scoredAt: new Date(),
          overviewStatus: MockOverviewStatus.FALLBACK,
          summary: 'Chưa có câu trả lời nào được chấm thành công.',
          strengths: [],
          weaknesses: ['Các câu trả lời chưa thể chấm điểm.'],
          nextRecommendations: [
            'Bạn có thể thử nộp lại hoặc tạo một mock interview mới.',
          ],
        },
      });
      return;
    }

    // Tính điểm trung bình từ các câu đã chấm
    const averages = this.averageScores(scored.map((q) => q.session!.score!));
    // Viết input cho prompt tổng hợp overview
    const overviewInput: MockInterviewOverviewInput = {
      title: mock.title,
      topics: mock.topicLinks.map((link) => link.topic.name),
      durationSeconds: mock.durationSeconds,
      answeredQuestions: scored.length,
      totalQuestions: mock.totalQuestions,
      ...averages,
      scores: scored.map((q) => ({
        order: q.order,
        question: q.question.content,
        technicalScore: q.session!.score!.technicalScore,
        completenessScore: q.session!.score!.completenessScore,
        clarityScore: q.session!.score!.clarityScore,
        summary: q.session!.score!.summary,
        improvements: q.session!.score!.improvements,
        matchedKeywords: q.session!.score!.matchedKeywords,
        missedKeywords: q.session!.score!.missedKeywords,
      })),
    };

    // Gọi AI để tổng hợp overview, nếu thất bại thì fallback.
    try {
      const overview = await this.scoring.mockInterviewOverview(overviewInput);
      await this.prisma.mockInterview.update({
        where: { id: mockInterviewId },
        data: {
          status: MockInterviewStatus.SCORED,
          scoredAt: new Date(),
          ...averages,
          summary: overview.summary,
          strengths: overview.strengths,
          weaknesses: overview.weaknesses,
          nextRecommendations: overview.nextRecommendations,
          overviewStatus: MockOverviewStatus.GENERATED,
          overviewError: null,
        },
      });
    } catch (err) {
      const fallback = this.buildFallbackOverview(overviewInput);
      await this.prisma.mockInterview.update({
        where: { id: mockInterviewId },
        data: {
          status: MockInterviewStatus.SCORED,
          scoredAt: new Date(),
          ...averages,
          ...fallback,
          overviewStatus: MockOverviewStatus.FALLBACK,
          overviewError: this.messageFromError(err),
        },
      });
    }
  }

  // Hàm tính điểm trung bình từ các câu đã chấm, để lưu vào mock interview tổng quan.
  private averageScores(
    scores: Array<{
      technicalScore: number;
      completenessScore: number;
      clarityScore: number;
    }>,
  ) {
    const technical = scores.reduce((sum, s) => sum + s.technicalScore, 0);
    const completeness = scores.reduce(
      (sum, s) => sum + s.completenessScore,
      0,
    );
    const clarity = scores.reduce((sum, s) => sum + s.clarityScore, 0);
    const n = scores.length;
    const averageTechnicalScore = round1(technical / n);
    const averageCompletenessScore = round1(completeness / n);
    const averageClarityScore = round1(clarity / n);
    const overallScore = round1(
      (averageTechnicalScore + averageCompletenessScore + averageClarityScore) /
        3,
    );

    return {
      averageTechnicalScore,
      averageCompletenessScore,
      averageClarityScore,
      overallScore,
    };
  }

  // Nếu tổng hợp overview thất bại (vd LLM timeout, lỗi API...), vẫn tạo 1 bản fallback để user nhận được thông báo thay vì treo.
  private buildFallbackOverview(input: MockInterviewOverviewInput) {
    const missed = topKeywords(input.scores.flatMap((s) => s.missedKeywords));
    const weakQuestions = input.scores
      .map((s) => ({
        label: `Câu ${s.order}`,
        score: (s.technicalScore + s.completenessScore + s.clarityScore) / 3,
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map((q) => q.label);

    return {
      summary: `Bạn đã hoàn thành ${input.answeredQuestions}/${input.totalQuestions} câu, điểm trung bình ${input.overallScore}.`,
      strengths:
        input.overallScore >= 7
          ? ['Bạn có nền tảng trả lời khá ổn ở các câu đã hoàn thành.']
          : [],
      weaknesses:
        missed.length > 0
          ? [`Bạn còn thiếu các ý quan trọng: ${missed.join(', ')}.`]
          : ['Một số câu trả lời cần đầy đủ và rõ ý hơn.'],
      nextRecommendations:
        weakQuestions.length > 0
          ? [
              `Ôn lại ${weakQuestions.join(', ')} và luyện trả lời có ví dụ cụ thể hơn.`,
            ]
          : ['Tiếp tục luyện thêm một mock interview cùng chủ đề.'],
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === 'P2002'
    );
  }

  private messageFromError(err: unknown): string {
    return err instanceof HttpException || err instanceof Error
      ? err.message
      : GENERIC_FAILURE_MESSAGE;
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function topKeywords(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => key);
}
