import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MockCvAnalysisStatus,
  MockCvQuestionGenerationStatus,
  MockInterviewStatus,
  Prisma,
} from '@prisma/client';
import { lockAdvisoryKey } from '../../../common/utils/billing-lock.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { MockInterviewJobsService } from '../../mock-interviews/mock-interview-jobs.service';
import { MockCvQuestionPreparationService } from '../../ai-jobs/services/mock-cv-question-preparation.service';
import { DEFAULT_MOCK_CV_DURATION_SECONDS } from '../analysis/mock-cv.constants';
import { MockCvOperationLockService } from '../mock-cv-operation-lock.service';

const INTERVIEW_SELECT = {
  id: true,
  title: true,
  status: true,
  totalQuestions: true,
  durationSeconds: true,
  startedAt: true,
  expiresAt: true,
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
    },
  },
} satisfies Prisma.MockCvInterviewSelect;

@Injectable()
export class MockCvsService {
  private readonly logger = new Logger(MockCvsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly questionPreparation: MockCvQuestionPreparationService,
    private readonly mockInterviewJobs: MockInterviewJobsService,
    private readonly operationLock: MockCvOperationLockService,
  ) {}

  async start(id: string, userId: string) {
    const lock = await this.operationLock.acquire(id);
    try {
      return await this.startLocked(id, userId);
    } finally {
      await this.operationLock.release(lock);
    }
  }

  private async startLocked(id: string, userId: string) {
    const mockCv = await this.prisma.mockCv.findFirst({
      where: { id, userId },
      select: {
        id: true,
        analysis: {
          select: {
            id: true,
            status: true,
            questionGenerationStatus: true,
            questionGenerationAttempt: true,
            questionGenerationStartedAt: true,
            requestedQuestionCount: true,
            requestedDurationSeconds: true,
          },
        },
      },
    });
    if (!mockCv?.analysis) throw new NotFoundException('Không tìm thấy CV.');
    const analysis = mockCv.analysis;
    if (
      analysis.status === MockCvAnalysisStatus.UNSUPPORTED ||
      analysis.status === MockCvAnalysisStatus.NEEDS_REUPLOAD ||
      analysis.status === MockCvAnalysisStatus.FAILED
    ) {
      throw new ConflictException('CV chưa sẵn sàng để bắt đầu phỏng vấn.');
    }
    if (analysis.status !== MockCvAnalysisStatus.READY) {
      return { status: 'PREPARING', mockCvId: id, analysisId: analysis.id };
    }

    if (
      analysis.questionGenerationStatus !== MockCvQuestionGenerationStatus.READY
    ) {
      const preparation = await this.questionPreparation.ensureQueued(
        analysis.id,
        userId,
        { chargeUserRetry: true },
      );
      if (preparation === 'FAILED') {
        throw new ConflictException(
          'Chưa thể chuẩn bị câu hỏi lúc này. Vui lòng thử lại sau.',
        );
      }
      if (preparation === 'READY') {
        return this.createOrGetActiveInterview(
          id,
          userId,
          analysis.requestedDurationSeconds ?? DEFAULT_MOCK_CV_DURATION_SECONDS,
        );
      }

      return {
        status: 'PREPARING',
        mockCvId: id,
        analysisId: analysis.id,
      };
    }

    // Nếu đã có bộ câu hỏi sẵn sàng, tạo hoặc lấy phòng phỏng vấn đang làm.
    return this.createOrGetActiveInterview(
      id,
      userId,
      analysis.requestedDurationSeconds ?? DEFAULT_MOCK_CV_DURATION_SECONDS,
    );
  }

  private async createOrGetActiveInterview(
    mockCvId: string,
    userId: string,
    durationSeconds: number,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock theo CV để hai request start song song không tạo hai phòng đang làm.
      await lockAdvisoryKey(tx, `mock-cv-start:${mockCvId}`);

      const existing = await tx.mockCvInterview.findFirst({
        where: {
          mockCvId,
          userId,
          status: {
            in: [MockInterviewStatus.DRAFT, MockInterviewStatus.IN_PROGRESS],
          },
        },
        orderBy: { createdAt: 'desc' },
        select: INTERVIEW_SELECT,
      });
      if (existing) return { status: 'STARTED', interview: existing };

      const mockCv = await tx.mockCv.findFirst({
        where: {
          id: mockCvId,
          userId,
          analysis: {
            is: {
              status: MockCvAnalysisStatus.READY,
              questionGenerationStatus: MockCvQuestionGenerationStatus.READY,
            },
          },
        },
        select: {
          targetRole: true,
          analysis: { select: { requestedQuestionCount: true } },
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
            },
          },
        },
      });
      if (!mockCv?.analysis) {
        throw new ConflictException('Bộ câu hỏi chưa sẵn sàng.');
      }
      if (mockCv.questions.length !== mockCv.analysis.requestedQuestionCount) {
        throw new ConflictException(
          'Bộ câu hỏi chưa đầy đủ. Vui lòng thử lại sau.',
        );
      }

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1_000);
      const interview = await tx.mockCvInterview.create({
        data: {
          mockCvId,
          userId,
          title: `Phỏng vấn CV - ${mockCv.targetRole}`.slice(0, 255),
          status: MockInterviewStatus.IN_PROGRESS,
          totalQuestions: mockCv.questions.length,
          durationSeconds,
          startedAt,
          expiresAt,
          questions: {
            create: mockCv.questions.map((question) => ({
              mockCvQuestionId: question.id,
              order: question.order,
              source: question.source,
              focusArea: question.focusArea,
              content: question.content,
              answerKeySummary: question.answerKeySummary,
              answerKeywords: question.answerKeywords,
            })),
          },
        },
        select: INTERVIEW_SELECT,
      });

      return { status: 'STARTED', interview };
    });

    if (
      result.interview.status === MockInterviewStatus.IN_PROGRESS &&
      result.interview.expiresAt
    ) {
      try {
        // Enqueue sau commit; recovery scheduler sẽ bù nếu Redis đang gián đoạn.
        await this.mockInterviewJobs.enqueueMockCvAutoSubmit(
          result.interview.id,
          userId,
          result.interview.expiresAt,
        );
      } catch (error) {
        this.logger.error(
          `Không thể tạo delayed job cho Mock CV ${result.interview.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return result;
  }
}
