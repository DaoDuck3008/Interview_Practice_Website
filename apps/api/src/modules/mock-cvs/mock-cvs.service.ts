import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MockCvAnalysisStatus,
  MockCvQuestionGenerationStatus,
  MockInterviewStatus,
  Prisma,
} from '@prisma/client';
import { lockAdvisoryKey } from '../../common/utils/billing-lock.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AiJobsService } from '../ai-jobs/ai-jobs.service';
import { MOCK_CV_JOB_STALE_MS } from '../mock-cv-analysis/mock-cv.constants';
import { StartMockCvInterviewDto } from '../mock-cv-analysis/dto/start-mock-cv-interview.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiJobs: AiJobsService,
  ) {}

  async start(id: string, userId: string, dto: StartMockCvInterviewDto) {
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
          },
        },
      },
    });
    if (!mockCv?.analysis) throw new NotFoundException('Không tìm thấy CV.');
    if (mockCv.analysis.status !== MockCvAnalysisStatus.READY) {
      throw new ConflictException('CV chưa sẵn sàng để bắt đầu phỏng vấn.');
    }

    const analysis = mockCv.analysis;
    if (
      analysis.requestedQuestionCount !== null &&
      analysis.requestedQuestionCount !== dto.totalQuestions
    ) {
      throw new ConflictException(
        `Bộ câu hỏi của CV này đã được đặt là ${analysis.requestedQuestionCount} câu và không thể thay đổi.`,
      );
    }

    if (
      analysis.questionGenerationStatus !== MockCvQuestionGenerationStatus.READY
    ) {
      const claimed = await this.claimQuestionGeneration(
        analysis.id,
        userId,
        dto.totalQuestions,
      );

      if (claimed) {
        const current = await this.prisma.mockCvAnalysis.findUnique({
          where: { id: analysis.id },
          select: { questionGenerationAttempt: true },
        });
        if (!current) throw new NotFoundException('Không tìm thấy CV.');

        try {
          await this.aiJobs.enqueueMockCvQuestionGeneration(
            analysis.id,
            userId,
            current.questionGenerationAttempt,
          );
        } catch {
          await this.prisma.mockCvAnalysis.updateMany({
            where: {
              id: analysis.id,
              questionGenerationStatus:
                MockCvQuestionGenerationStatus.GENERATING,
              questionGenerationAttempt: current.questionGenerationAttempt,
            },
            data: {
              questionGenerationStatus: MockCvQuestionGenerationStatus.FAILED,
              questionGenerationError: 'QUEUE_ENQUEUE_FAILED',
            },
          });
          throw new ConflictException(
            'Chưa thể chuẩn bị câu hỏi lúc này. Vui lòng thử lại sau.',
          );
        }
      } else {
        // Trạng thái có thể đổi ngay sau lần đọc đầu tiên do request/job khác.
        const current = await this.prisma.mockCvAnalysis.findUnique({
          where: { id: analysis.id },
          select: {
            requestedQuestionCount: true,
            questionGenerationStatus: true,
          },
        });
        if (!current) throw new NotFoundException('Không tìm thấy CV.');
        if (
          current.requestedQuestionCount !== null &&
          current.requestedQuestionCount !== dto.totalQuestions
        ) {
          throw new ConflictException(
            `Bộ câu hỏi của CV này đã được đặt là ${current.requestedQuestionCount} câu và không thể thay đổi.`,
          );
        }
        if (
          current.questionGenerationStatus ===
          MockCvQuestionGenerationStatus.READY
        ) {
          return this.createOrGetActiveInterview(
            id,
            userId,
            dto.durationSeconds,
          );
        }
      }

      return {
        status: 'PREPARING',
        mockCvId: id,
        analysisId: analysis.id,
      };
    }

    return this.createOrGetActiveInterview(id, userId, dto.durationSeconds);
  }

  private async claimQuestionGeneration(
    analysisId: string,
    userId: string,
    totalQuestions: number,
  ): Promise<boolean> {
    const now = new Date();
    const staleAt = new Date(now.getTime() - MOCK_CV_JOB_STALE_MS);
    const claimed = await this.prisma.mockCvAnalysis.updateMany({
      where: {
        id: analysisId,
        mockCv: { is: { userId } },
        OR: [
          { questionGenerationStatus: MockCvQuestionGenerationStatus.PENDING },
          { questionGenerationStatus: MockCvQuestionGenerationStatus.FAILED },
          {
            questionGenerationStatus:
              MockCvQuestionGenerationStatus.GENERATING,
            questionGenerationStartedAt: { lte: staleAt },
          },
        ],
        AND: [
          {
            OR: [
              { requestedQuestionCount: null },
              { requestedQuestionCount: totalQuestions },
            ],
          },
        ],
      },
      data: {
        questionGenerationStatus: MockCvQuestionGenerationStatus.GENERATING,
        questionGenerationAttempt: { increment: 1 },
        questionGenerationStartedAt: now,
        requestedQuestionCount: totalQuestions,
        questionGenerationError: null,
      },
    });
    return claimed.count === 1;
  }

  private async createOrGetActiveInterview(
    mockCvId: string,
    userId: string,
    durationSeconds: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
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
        throw new ConflictException('Bộ câu hỏi chưa đầy đủ. Vui lòng thử lại sau.');
      }

      const startedAt = new Date();
      const expiresAt = new Date(
        startedAt.getTime() + durationSeconds * 1_000,
      );
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
  }
}
