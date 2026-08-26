import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Job } from 'bullmq';
import { AiCreditFeature } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import { ScoringService } from '../../scoring/scoring.service';
import { SCORING_PROMPT_VERSION } from '../../scoring/prompts/scoring.prompt';
import {
  deleteSessionAndAudio,
  transientZeroScore,
} from '../../sessions/session-score.utils';
import { StorageService } from '../../storage/storage.service';
import type { ScoreJobData } from '../ai-jobs.types';
import { GENERIC_AI_JOB_FAILURE_MESSAGE } from '../ai-jobs.constants';
import { MockInterviewScoringService } from '../services/mock-interview-scoring.service';
import { MockCvInterviewScoringService } from '../services/mock-cv-interview-scoring.service';
import { AiCreditsService } from '../../ai-credits/ai-credits.service';
import { aiCreditReservationKey } from '../../ai-credits/ai-credit-pricing';

type MockScoreOwner = 'MOCK_INTERVIEW' | 'MOCK_CV_INTERVIEW' | null;

@Injectable()
export class ScoreJobHandler {
  private readonly logger = new Logger(ScoreJobHandler.name);
  private readonly handledFailureJobIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scoring: ScoringService,
    private readonly mockInterviewScoring: MockInterviewScoringService,
    private readonly mockCvInterviewScoring: MockCvInterviewScoringService,
    private readonly websocket: WebsocketGateway,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async process(job: Job<ScoreJobData>): Promise<void> {
    const { sessionId, userId } = job.data;
    const chargeOverview = job.data.chargeOverview !== false;
    const creditKey = aiCreditReservationKey(
      AiCreditFeature.ANSWER_AUDIO,
      'SESSION',
      sessionId,
    );
    let mockOwner: MockScoreOwner = null;
    try {
      await this.aiCredits.extendByIdempotencyKey(creditKey);
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          question: true,
          mockInterviewQuestion: true,
          mockCvInterviewQuestion: true,
        },
      });
      if (!session) {
        await this.aiCredits.releaseByIdempotencyKey(
          creditKey,
          'Session đã bị xóa trước khi chấm điểm.',
        );
        const error = new NotFoundException(
          'Session không tồn tại (có thể đã bị xóa).',
        );
        this.emitFailure(job.id, userId, sessionId, error, false);
        return;
      }
      mockOwner = session.mockCvInterviewQuestion
        ? 'MOCK_CV_INTERVIEW'
        : session.mockInterviewQuestion
          ? 'MOCK_INTERVIEW'
          : null;

      const existing = await this.prisma.score.findUnique({
        where: { sessionId },
      });
      if (existing) {
        await this.aiCredits.consumeByIdempotencyKey(creditKey);
        await this.markSuccess(sessionId, mockOwner, chargeOverview);
        this.websocket.emitToUser(userId, 'score:ready', {
          sessionId,
          score: existing,
        });
        return;
      }

      // Mock CV luôn ưu tiên snapshot để admin sửa question bank không làm đổi đáp án giữa bài.
      const question = session.mockCvInterviewQuestion ?? session.question;
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
        await this.aiCredits.releaseByIdempotencyKey(
          creditKey,
          'Audio không có transcript nên không gọi chấm điểm AI.',
        );
      } else {
        score = await this.createScore(sessionId, result);
        await this.aiCredits.consumeByIdempotencyKey(creditKey);
      }

      await this.markSuccess(sessionId, mockOwner, chargeOverview);
      this.websocket.emitToUser(userId, 'score:ready', { sessionId, score });
    } catch (error) {
      await this.aiCredits.releaseByIdempotencyKey(
        creditKey,
        'Job chấm điểm thất bại.',
      );
      await this.markFailure(sessionId, mockOwner, error, chargeOverview);
      this.emitFailure(job.id, userId, sessionId, error, true);
      throw error;
    }
  }

  /** Điều hướng lifecycle theo relation của Session; session luyện tập đơn không có mock owner. */
  private async markSuccess(
    sessionId: string,
    owner: MockScoreOwner,
    chargeOverview: boolean,
  ): Promise<void> {
    if (owner === 'MOCK_CV_INTERVIEW') {
      await this.mockCvInterviewScoring.markSuccess(sessionId, chargeOverview);
    } else if (owner === 'MOCK_INTERVIEW') {
      await this.mockInterviewScoring.markSuccess(sessionId, chargeOverview);
    }
  }

  /** Đánh dấu FAILED đúng bảng question item để retry không tác động nhầm loại mock. */
  private async markFailure(
    sessionId: string,
    owner: MockScoreOwner,
    error: unknown,
    chargeOverview: boolean,
  ): Promise<void> {
    if (owner === 'MOCK_CV_INTERVIEW') {
      await this.mockCvInterviewScoring.markFailure(
        sessionId,
        error,
        chargeOverview,
      );
    } else if (owner === 'MOCK_INTERVIEW') {
      await this.mockInterviewScoring.markFailure(
        sessionId,
        error,
        chargeOverview,
      );
    }
  }

  onFailed(job: Job<ScoreJobData>) {
    if (job.id && this.handledFailureJobIds.delete(job.id)) return;

    this.logger.error(
      `Job ${job.name} (${job.id}) thất bại: ${job.failedReason}`,
    );
    this.websocket.emitToUser(job.data.userId, 'score:failed', {
      sessionId: job.data.sessionId,
      message: GENERIC_AI_JOB_FAILURE_MESSAGE,
    });
  }

  /** DB unique constraint là lớp phòng thủ cuối nếu hai worker cùng tạo một Score. */
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
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await this.prisma.score.findUnique({
          where: { sessionId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private emitFailure(
    jobId: string | undefined,
    userId: string,
    sessionId: string,
    error: unknown,
    willFailJob: boolean,
  ) {
    if (jobId && willFailJob) this.handledFailureJobIds.add(jobId);
    const message =
      error instanceof HttpException
        ? error.message
        : GENERIC_AI_JOB_FAILURE_MESSAGE;
    this.logger.error(
      `Job score thất bại — session ${sessionId}: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
    this.websocket.emitToUser(userId, 'score:failed', {
      sessionId,
      message,
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}
