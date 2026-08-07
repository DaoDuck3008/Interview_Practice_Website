import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MockCvReadiness,
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionAnswerStatus,
  MockQuestionScoreStatus,
  Prisma,
} from '@prisma/client';
import { CacheService } from '../../cache/cache.service';
import { lockAdvisoryKey } from '../../common/utils/billing-lock.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AiJobsService } from '../ai-jobs/ai-jobs.service';
import {
  MOCK_ANSWER_GRACE_MS,
  MOCK_AUTO_SUBMIT_BUFFER_MS,
  MOCK_EXPIRED_RECOVERY_BATCH_SIZE,
  MOCK_SCORING_STALE_MS,
} from '../mock-core/mock-core.constants';
import { MockAnswerLockService } from '../mock-core/services/mock-answer-lock.service';
import {
  MockAnswerMediaService,
  type PreparedMockAnswerMedia,
} from '../mock-core/services/mock-answer-media.service';
import { assertMockCanAnswer } from '../mock-core/utils/mock-deadline.util';
import {
  isMockScoringStale,
  mockScoringRetryWaitSeconds,
} from '../mock-core/utils/mock-retry.util';

const ROOM_SELECT = {
  id: true,
  mockCvId: true,
  title: true,
  status: true,
  totalQuestions: true,
  durationSeconds: true,
  startedAt: true,
  expiresAt: true,
  submittedAt: true,
  scoredAt: true,
  overviewStatus: true,
  createdAt: true,
  questions: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      source: true,
      focusArea: true,
      content: true,
      answerStatus: true,
      scoreStatus: true,
      answeredAt: true,
      skippedAt: true,
      session: {
        select: {
          id: true,
          audioUrl: true,
          transcript: true,
          duration: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.MockCvInterviewSelect;

const RESULT_SELECT = {
  ...ROOM_SELECT,
  averageTechnicalScore: true,
  averageCompletenessScore: true,
  averageClarityScore: true,
  overallScore: true,
  summary: true,
  strengths: true,
  weaknesses: true,
  nextRecommendations: true,
  overviewStatus: true,
  readiness: true,
  claimsToPrepareEvidence: true,
  questions: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      source: true,
      focusArea: true,
      content: true,
      answerKeySummary: true,
      answerKeywords: true,
      answerStatus: true,
      scoreStatus: true,
      scoreError: true,
      answeredAt: true,
      skippedAt: true,
      session: {
        select: {
          id: true,
          audioUrl: true,
          transcript: true,
          duration: true,
          createdAt: true,
          score: true,
        },
      },
    },
  },
} satisfies Prisma.MockCvInterviewSelect;

/**
 * Service domain của phòng Mock CV Interview: ownership, answer transaction, submit/retry/result.
 * Pipeline audio/lock/deadline lấy từ mock-core; AI scoring được enqueue qua AiJobsService.
 */
@Injectable()
export class MockCvInterviewsService {
  private readonly logger = new Logger(MockCvInterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly answerMedia: MockAnswerMediaService,
    private readonly answerLock: MockAnswerLockService,
    private readonly aiJobs: AiJobsService,
    private readonly cache: CacheService,
  ) {}

  getOwned(id: string, userId: string) {
    return this.findOwnedOrThrow(id, userId, ROOM_SELECT);
  }

  async getResult(id: string, userId: string) {
    const result = await this.findOwnedOrThrow(id, userId, RESULT_SELECT);
    if (!result.submittedAt) {
      throw new ConflictException('Bài phỏng vấn này chưa được nộp.');
    }
    return result;
  }

  /** Lưu một câu trả lời; advisory lock chỉ bao quanh transaction để không giữ DB lock khi gọi Whisper/R2. */
  async answer(
    id: string,
    questionItemId: string,
    userId: string,
    file: Express.Multer.File,
    duration: number,
  ) {
    if (!file) {
      throw new BadRequestException('Không có file audio được gửi lên.');
    }

    const item = await this.prisma.mockCvInterviewQuestion.findFirst({
      where: { id: questionItemId, mockCvInterview: { id, userId } },
      include: {
        mockCvInterview: true,
        mockCvQuestion: { select: { bankQuestionId: true } },
      },
    });
    if (!item) {
      throw new NotFoundException('Câu hỏi trong Mock CV không tồn tại.');
    }
    assertMockCanAnswer(item.mockCvInterview);
    if (
      item.sessionId ||
      item.answerStatus === MockQuestionAnswerStatus.ANSWERED
    ) {
      throw new ConflictException('Câu này đã được trả lời.');
    }

    const lock = await this.answerLock.acquire(
      `lock:mock-cv-answer:${questionItemId}`,
    );
    let prepared: PreparedMockAnswerMedia | undefined;
    let committed = false;
    try {
      prepared = await this.answerMedia.prepare({
        userId,
        file,
        reportedDuration: duration,
        logContext: `câu trả lời Mock CV ${questionItemId}`,
      });
      const preparedMedia = prepared;

      const session = await this.prisma.$transaction(async (tx) => {
        await lockAdvisoryKey(tx, this.advisoryLockKey(id));
        const fresh = await tx.mockCvInterviewQuestion.findFirst({
          where: { id: questionItemId, mockCvInterview: { id, userId } },
          include: {
            mockCvInterview: true,
            mockCvQuestion: { select: { bankQuestionId: true } },
          },
        });
        if (!fresh) {
          throw new NotFoundException('Câu hỏi trong Mock CV không tồn tại.');
        }
        assertMockCanAnswer(fresh.mockCvInterview);
        if (fresh.sessionId) {
          throw new ConflictException('Câu này đã được trả lời.');
        }

        const created = await tx.session.create({
          data: {
            userId,
            questionId: fresh.mockCvQuestion?.bankQuestionId ?? null,
            audioUrl: preparedMedia.audioUrl,
            transcript: preparedMedia.transcript,
            duration: preparedMedia.duration,
          },
        });
        await tx.mockCvInterviewQuestion.update({
          where: { id: questionItemId },
          data: {
            sessionId: created.id,
            answerStatus: MockQuestionAnswerStatus.ANSWERED,
            answeredAt: new Date(),
          },
        });
        await this.answerMedia.consumeInTransaction(
          tx,
          preparedMedia,
          created.id,
        );
        return created;
      });
      committed = true;

      try {
        await Promise.all([
          this.answerMedia.invalidateQuota(userId),
          this.cache.del(
            `sessions:me:stats:${userId}`,
            `sessions:me:heatmap:${userId}`,
          ),
        ]);
      } catch (cacheError) {
        this.logger.warn(
          `Không thể xóa cache sau khi lưu câu trả lời Mock CV ${questionItemId}: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`,
        );
      }
      return session;
    } catch (error) {
      if (!committed && prepared) {
        await this.answerMedia.discard(
          prepared,
          `câu trả lời Mock CV ${questionItemId}`,
        );
      }
      throw error;
    } finally {
      await this.answerLock.release(lock);
    }
  }

  /** Chốt bài idempotent, đánh dấu câu bỏ qua và enqueue chấm các Session đã trả lời. */
  async submit(id: string, userId: string) {
    const mock = await this.prisma.mockCvInterview.findFirst({
      where: { id, userId },
      select: { status: true },
    });
    if (!mock) throw new NotFoundException('Mock CV Interview không tồn tại.');
    if (
      mock.status === MockInterviewStatus.SUBMITTED ||
      mock.status === MockInterviewStatus.SCORING ||
      mock.status === MockInterviewStatus.SCORED
    ) {
      return this.getOwned(id, userId);
    }
    if (mock.status !== MockInterviewStatus.IN_PROGRESS) {
      throw new ConflictException('Bài phỏng vấn chưa ở trạng thái làm bài.');
    }

    const now = new Date();
    const submitted = await this.prisma.$transaction(async (tx) => {
      await lockAdvisoryKey(tx, this.advisoryLockKey(id));
      const claimed = await tx.mockCvInterview.updateMany({
        where: { id, userId, status: MockInterviewStatus.IN_PROGRESS },
        data: {
          status: MockInterviewStatus.SCORING,
          submittedAt: now,
          overviewStatus: MockOverviewStatus.PENDING,
          overviewError: null,
        },
      });
      if (claimed.count === 0) return false;
      await tx.mockCvInterviewQuestion.updateMany({
        where: { mockCvInterviewId: id, sessionId: null },
        data: {
          answerStatus: MockQuestionAnswerStatus.SKIPPED,
          scoreStatus: MockQuestionScoreStatus.SKIPPED,
          skippedAt: now,
        },
      });
      return true;
    });
    if (!submitted) {
      const current = await this.getOwned(id, userId);
      if (
        current.status === MockInterviewStatus.SUBMITTED ||
        current.status === MockInterviewStatus.SCORING ||
        current.status === MockInterviewStatus.SCORED
      ) {
        return current;
      }
      throw new ConflictException('Bài phỏng vấn chưa ở trạng thái làm bài.');
    }

    const answered = await this.prisma.mockCvInterviewQuestion.findMany({
      where: { mockCvInterviewId: id, sessionId: { not: null } },
      select: { id: true, sessionId: true },
    });
    if (answered.length === 0) {
      await this.prisma.mockCvInterview.update({
        where: { id },
        data: {
          status: MockInterviewStatus.SCORED,
          scoredAt: new Date(),
          overviewStatus: MockOverviewStatus.FALLBACK,
          readiness: MockCvReadiness.NOT_READY,
          summary: 'Bạn chưa trả lời câu nào trong buổi phỏng vấn CV này.',
          strengths: [],
          weaknesses: ['Chưa có câu trả lời nào để đánh giá.'],
          claimsToPrepareEvidence: [],
          nextRecommendations: [
            'Hãy thử lại với thời lượng dài hơn hoặc ít câu hỏi hơn.',
          ],
        },
      });
      return this.getOwned(id, userId);
    }

    const targets = answered.filter(
      (question): question is { id: string; sessionId: string } =>
        !!question.sessionId,
    );
    await this.prisma.mockCvInterviewQuestion.updateMany({
      where: {
        id: { in: targets.map((question) => question.id) },
        scoreStatus: MockQuestionScoreStatus.PENDING,
      },
      data: { scoreStatus: MockQuestionScoreStatus.QUEUED, scoreError: null },
    });
    await this.enqueueScoreJobs(targets, userId, id);
    return this.getOwned(id, userId);
  }

  /** Retry câu FAILED/QUEUED stale hoặc riêng overview lỗi; không chấm lại Session đã có Score. */
  async retryScoring(id: string, userId: string) {
    const now = new Date();
    const plan = await this.prisma.$transaction(async (tx) => {
      await lockAdvisoryKey(tx, this.advisoryLockKey(id));
      const mock = await tx.mockCvInterview.findFirst({
        where: { id, userId },
        select: {
          status: true,
          submittedAt: true,
          updatedAt: true,
          lastScoringRetryAt: true,
          overviewStatus: true,
        },
      });
      if (!mock) {
        throw new NotFoundException('Mock CV Interview không tồn tại.');
      }
      if (!mock.submittedAt) {
        throw new ConflictException('Bài phỏng vấn này chưa được nộp.');
      }
      if (
        mock.status !== MockInterviewStatus.SCORING &&
        mock.status !== MockInterviewStatus.SUBMITTED &&
        mock.status !== MockInterviewStatus.SCORED
      ) {
        throw new ConflictException('Bài phỏng vấn chưa thể chấm lại.');
      }

      const waitSeconds = mockScoringRetryWaitSeconds(
        mock.lastScoringRetryAt,
        now,
      );
      if (waitSeconds > 0) {
        throw new ConflictException(
          `Vui lòng chờ ${waitSeconds} giây trước khi chấm lại.`,
        );
      }
      const scoringStale = isMockScoringStale(mock, now);
      const overviewStale =
        mock.status === MockInterviewStatus.SUBMITTED &&
        now.getTime() - mock.updatedAt.getTime() >= MOCK_SCORING_STALE_MS;
      const candidates = await tx.mockCvInterviewQuestion.findMany({
        where: {
          mockCvInterviewId: id,
          sessionId: { not: null },
          scoreStatus: {
            in: [
              MockQuestionScoreStatus.FAILED,
              MockQuestionScoreStatus.QUEUED,
            ],
          },
        },
        select: {
          id: true,
          sessionId: true,
          scoreStatus: true,
          session: { select: { score: { select: { id: true } } } },
        },
      });
      const retryable = candidates.flatMap((question) =>
        question.sessionId &&
        !question.session?.score &&
        (question.scoreStatus === MockQuestionScoreStatus.FAILED ||
          scoringStale)
          ? [{ id: question.id, sessionId: question.sessionId }]
          : [],
      );

      if (retryable.length > 0) {
        await tx.mockCvInterviewQuestion.updateMany({
          where: { id: { in: retryable.map((question) => question.id) } },
          data: {
            scoreStatus: MockQuestionScoreStatus.QUEUED,
            scoreError: null,
          },
        });
        await tx.mockCvInterview.update({
          where: { id },
          data: {
            status: MockInterviewStatus.SCORING,
            lastScoringRetryAt: now,
            scoredAt: null,
            averageTechnicalScore: null,
            averageCompletenessScore: null,
            averageClarityScore: null,
            overallScore: null,
            summary: null,
            strengths: [],
            weaknesses: [],
            nextRecommendations: [],
            readiness: null,
            claimsToPrepareEvidence: [],
            overviewStatus: MockOverviewStatus.PENDING,
            overviewError: null,
            overviewPromptVersion: null,
          },
        });
        return { type: 'QUESTIONS' as const, targets: retryable };
      }

      if (mock.overviewStatus === MockOverviewStatus.FAILED || overviewStale) {
        await tx.mockCvInterview.update({
          where: { id },
          data: {
            status: MockInterviewStatus.SUBMITTED,
            lastScoringRetryAt: now,
            overviewStatus: MockOverviewStatus.PENDING,
            overviewError: null,
            overviewPromptVersion: null,
          },
        });
        return { type: 'OVERVIEW' as const, targets: [] };
      }

      throw new ConflictException(
        'Chưa có câu chấm lỗi hoặc kết quả bị kẹt để thực hiện lại.',
      );
    });

    if (plan.type === 'QUESTIONS') {
      await this.enqueueScoreJobs(plan.targets, userId, id);
    } else {
      await this.enqueueOverview(id, userId);
    }
    return this.getOwned(id, userId);
  }

  /** Dùng bởi mock-interview-jobs.processor; chỉ submit sau khi đã qua expiresAt + grace + buffer. */
  async autoSubmitExpired(id: string, userId: string) {
    const mock = await this.prisma.mockCvInterview.findFirst({
      where: { id, userId },
      select: { status: true, expiresAt: true },
    });
    if (
      !mock ||
      mock.status !== MockInterviewStatus.IN_PROGRESS ||
      !mock.expiresAt
    ) {
      this.logger.debug(
        `Bỏ qua auto-submit Mock CV ${id}: không còn IN_PROGRESS.`,
      );
      return;
    }
    const autoSubmitAt =
      mock.expiresAt.getTime() +
      MOCK_ANSWER_GRACE_MS +
      MOCK_AUTO_SUBMIT_BUFFER_MS;
    if (Date.now() < autoSubmitAt) {
      this.logger.debug(
        `Bỏ qua auto-submit Mock CV ${id}: chưa hết grace window.`,
      );
      return;
    }
    this.logger.log(`Bắt đầu tự nộp Mock CV Interview ${id}.`);
    await this.submit(id, userId);
    this.logger.log(`Đã tự nộp Mock CV Interview ${id}.`);
  }

  /** Trả một batch phòng hết hạn để recovery scheduler tạo lại delayed job bị thiếu.
   * Được gọi bởi mock-interview-jobs.processor ; không throw để không block các phòng khác.
   */
  async findExpiredForAutoSubmit(): Promise<
    Array<{ id: string; userId: string; expiresAt: Date }>
  > {
    const rows = await this.prisma.mockCvInterview.findMany({
      where: {
        status: MockInterviewStatus.IN_PROGRESS,
        expiresAt: { not: null, lte: new Date() },
      },
      select: { id: true, userId: true, expiresAt: true },
      orderBy: { expiresAt: 'asc' },
      take: MOCK_EXPIRED_RECOVERY_BATCH_SIZE,
    });
    return rows.flatMap((row) =>
      row.expiresAt
        ? [{ id: row.id, userId: row.userId, expiresAt: row.expiresAt }]
        : [],
    );
  }

  // Hàm Đẩy các job score vào queue; nếu thất bại thì log error nhưng không throw để không block transaction.
  private async enqueueScoreJobs(
    questions: Array<{ sessionId: string }>,
    userId: string,
    interviewId: string,
  ) {
    const results = await Promise.allSettled(
      questions.map((question) =>
        this.aiJobs.enqueueScore(question.sessionId, userId),
      ),
    );
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      this.logger.error(
        `Không thể enqueue ${failed.length}/${questions.length} job score cho Mock CV ${interviewId}.`,
      );
    }
  }

  // Hàm dẩy overview job vào queue; nếu thất bại thì đánh dấu overviewStatus = FAILED để user biết.
  private async enqueueOverview(interviewId: string, userId: string) {
    try {
      await this.aiJobs.enqueueMockCvInterviewOverview(interviewId, userId);
    } catch (error) {
      await this.prisma.mockCvInterview.updateMany({
        where: {
          id: interviewId,
          status: MockInterviewStatus.SUBMITTED,
          overviewStatus: MockOverviewStatus.PENDING,
        },
        data: {
          overviewStatus: MockOverviewStatus.FAILED,
          overviewError: 'QUEUE_ENQUEUE_FAILED',
        },
      });
      this.logger.error(
        `Không thể enqueue overview Mock CV ${interviewId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async findOwnedOrThrow<T extends Prisma.MockCvInterviewSelect>(
    id: string,
    userId: string,
    select: T,
  ): Promise<Prisma.MockCvInterviewGetPayload<{ select: T }>> {
    const interview = await this.prisma.mockCvInterview.findFirst({
      where: { id, userId },
      select,
    });
    if (!interview) {
      throw new NotFoundException('Mock CV Interview không tồn tại.');
    }
    return interview;
  }

  private advisoryLockKey(interviewId: string) {
    return `mock-cv-interview:${interviewId}`;
  }
}
