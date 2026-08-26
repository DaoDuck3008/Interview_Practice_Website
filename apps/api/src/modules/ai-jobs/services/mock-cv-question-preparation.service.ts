import { Injectable, Logger } from '@nestjs/common';
import {
  MockCvAnalysisStatus,
  MockCvQuestionGenerationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import {
  DEFAULT_MOCK_CV_QUESTION_COUNT,
  MOCK_CV_QUESTION_JOB_STALE_MS,
} from '../../mock-cv/analysis/mock-cv.constants';
import { AiJobsService } from '../ai-jobs.service';
import { AiCreditsService } from '../../ai-credits/ai-credits.service';
import {
  aiCreditReservationKey,
  cvAnalysisFeature,
} from '../../ai-credits/ai-credit-pricing';

export type MockCvQuestionPreparationResult =
  | 'READY'
  | 'PREPARING'
  | 'FAILED'
  | 'BLOCKED';

@Injectable()
export class MockCvQuestionPreparationService {
  private readonly logger = new Logger(MockCvQuestionPreparationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiJobs: AiJobsService,
    private readonly websocket: WebsocketGateway,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async ensureQueued(
    analysisId: string,
    userId: string,
    options: { chargeUserRetry?: boolean } = {},
  ): Promise<MockCvQuestionPreparationResult> {
    const analysis = await this.prisma.mockCvAnalysis.findFirst({
      where: { id: analysisId, mockCv: { is: { userId } } },
      select: {
        mockCvId: true,
        status: true,
        questionGenerationStatus: true,
        questionGenerationAttempt: true,
        questionGenerationStartedAt: true,
        requestedQuestionCount: true,
      },
    });
    if (!analysis || analysis.status !== MockCvAnalysisStatus.READY) {
      return 'BLOCKED';
    }
    if (
      analysis.questionGenerationStatus === MockCvQuestionGenerationStatus.READY
    ) {
      return 'READY';
    }

    const now = new Date();
    const staleAt = new Date(now.getTime() - MOCK_CV_QUESTION_JOB_STALE_MS);
    const isActive =
      analysis.questionGenerationStatus ===
        MockCvQuestionGenerationStatus.GENERATING &&
      !!analysis.questionGenerationStartedAt &&
      analysis.questionGenerationStartedAt > staleAt;
    if (isActive) return 'PREPARING';

    const requestedQuestionCount =
      analysis.requestedQuestionCount ?? DEFAULT_MOCK_CV_QUESTION_COUNT;
    if (options.chargeUserRetry) {
      const feature = cvAnalysisFeature(requestedQuestionCount);
      await this.aiCredits.reserve({
        userId,
        feature,
        referenceType: 'MOCK_CV_ANALYSIS',
        referenceId: analysisId,
        idempotencyKey: aiCreditReservationKey(
          feature,
          'MOCK_CV_ANALYSIS',
          analysisId,
        ),
      });
    }
    const claimed = await this.prisma.mockCvAnalysis.updateMany({
      where: {
        id: analysisId,
        status: MockCvAnalysisStatus.READY,
        questionGenerationAttempt: analysis.questionGenerationAttempt,
        OR: [
          { questionGenerationStatus: MockCvQuestionGenerationStatus.PENDING },
          { questionGenerationStatus: MockCvQuestionGenerationStatus.FAILED },
          {
            questionGenerationStatus: MockCvQuestionGenerationStatus.GENERATING,
            questionGenerationStartedAt: { lte: staleAt },
          },
        ],
      },
      data: {
        questionGenerationStatus: MockCvQuestionGenerationStatus.GENERATING,
        questionGenerationAttempt: { increment: 1 },
        questionGenerationStartedAt: now,
        questionGenerationError: null,
        requestedQuestionCount,
      },
    });
    if (claimed.count === 0) {
      const current = await this.prisma.mockCvAnalysis.findUnique({
        where: { id: analysisId },
        select: { questionGenerationStatus: true },
      });
      if (
        current?.questionGenerationStatus ===
        MockCvQuestionGenerationStatus.READY
      ) {
        await this.aiCredits.releaseByReference(
          userId,
          'MOCK_CV_ANALYSIS',
          analysisId,
          'Bộ câu hỏi đã được hoàn tất bởi request song song.',
        );
        return 'READY';
      }
      return 'PREPARING';
    }

    const current = await this.prisma.mockCvAnalysis.findUnique({
      where: { id: analysisId },
      select: { questionGenerationAttempt: true },
    });
    if (!current) return 'BLOCKED';

    this.emitStatus(
      userId,
      analysis.mockCvId,
      analysisId,
      MockCvQuestionGenerationStatus.GENERATING,
    );

    try {
      await this.aiJobs.enqueueMockCvQuestionGeneration(
        analysisId,
        userId,
        current.questionGenerationAttempt,
      );
      return 'PREPARING';
    } catch (error) {
      await this.prisma.mockCvAnalysis.updateMany({
        where: {
          id: analysisId,
          questionGenerationStatus: MockCvQuestionGenerationStatus.GENERATING,
          questionGenerationAttempt: current.questionGenerationAttempt,
        },
        data: {
          questionGenerationStatus: MockCvQuestionGenerationStatus.FAILED,
          questionGenerationError: 'QUEUE_ENQUEUE_FAILED',
        },
      });
      await this.aiCredits.releaseByReference(
        userId,
        'MOCK_CV_ANALYSIS',
        analysisId,
        'Không enqueue được job sinh câu hỏi Mock CV.',
      );
      this.logger.error(
        `Không thể enqueue job sinh câu hỏi Mock CV ${analysisId}.`,
        error instanceof Error ? error.stack : undefined,
      );
      this.emitStatus(
        userId,
        analysis.mockCvId,
        analysisId,
        MockCvQuestionGenerationStatus.FAILED,
        'Không thể chuẩn bị câu hỏi lúc này. Bạn có thể thử lại sau.',
      );
      return 'FAILED';
    }
  }

  private emitStatus(
    userId: string,
    mockCvId: string,
    analysisId: string,
    status: MockCvQuestionGenerationStatus,
    message?: string,
  ) {
    this.websocket.emitToUser(userId, 'mock-cv:questions-updated', {
      mockCvId,
      analysisId,
      status,
      ...(message && { message }),
    });
  }
}
