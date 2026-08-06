import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import { ImprovementService } from '../../scoring/improvement.service';
import { SCORING_PROMPT_VERSION } from '../../scoring/prompts/scoring.prompt';
import type { ImproveJobData } from '../ai-jobs.types';
import { GENERIC_AI_JOB_FAILURE_MESSAGE } from '../ai-jobs.constants';

@Injectable()
export class ImproveJobHandler {
  private readonly logger = new Logger(ImproveJobHandler.name);
  private readonly handledFailureJobIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly improvement: ImprovementService,
    private readonly websocket: WebsocketGateway,
  ) {}

  async process(job: Job<ImproveJobData>): Promise<void> {
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
          new NotFoundException(
            'Session hoặc điểm chấm không tồn tại (có thể đã bị xóa).',
          ),
          false,
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
    } catch (error) {
      this.emitFailure(job.id, userId, sessionId, error, true);
      throw error;
    }
  }

  onFailed(job: Job<ImproveJobData>) {
    if (job.id && this.handledFailureJobIds.delete(job.id)) return;

    this.logger.error(
      `Job ${job.name} (${job.id}) thất bại: ${job.failedReason}`,
    );
    this.websocket.emitToUser(job.data.userId, 'improve:failed', {
      sessionId: job.data.sessionId,
      message: GENERIC_AI_JOB_FAILURE_MESSAGE,
    });
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
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await this.prisma.improvement.findUnique({
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
      `Job improve thất bại — session ${sessionId}: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
    this.websocket.emitToUser(userId, 'improve:failed', {
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
