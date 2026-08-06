import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Job } from 'bullmq';
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

@Injectable()
export class ScoreJobHandler {
  private readonly logger = new Logger(ScoreJobHandler.name);
  private readonly handledFailureJobIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scoring: ScoringService,
    private readonly mockInterviewScoring: MockInterviewScoringService,
    private readonly websocket: WebsocketGateway,
  ) {}

  async process(job: Job<ScoreJobData>): Promise<void> {
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
      if (!session) {
        const error = new NotFoundException(
          'Session không tồn tại (có thể đã bị xóa).',
        );
        await this.mockInterviewScoring.markFailure(sessionId, error);
        this.emitFailure(job.id, userId, sessionId, error, false);
        return;
      }

      const existing = await this.prisma.score.findUnique({
        where: { sessionId },
      });
      if (existing) {
        await this.mockInterviewScoring.markSuccess(sessionId);
        this.websocket.emitToUser(userId, 'score:ready', {
          sessionId,
          score: existing,
        });
        return;
      }

      // Câu AI của Mock CV không có Question; khi đó dùng snapshot trong phòng phỏng vấn.
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

      await this.mockInterviewScoring.markSuccess(sessionId);
      this.websocket.emitToUser(userId, 'score:ready', { sessionId, score });
    } catch (error) {
      await this.mockInterviewScoring.markFailure(sessionId, error);
      this.emitFailure(job.id, userId, sessionId, error, true);
      throw error;
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
