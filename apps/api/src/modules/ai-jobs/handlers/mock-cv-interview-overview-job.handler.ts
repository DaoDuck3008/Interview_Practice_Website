import { Injectable, Logger } from '@nestjs/common';
import {
  AiCreditFeature,
  MockCvReadiness,
  MockInterviewStatus,
  MockOverviewStatus,
} from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import { MockCvInterviewOverviewService } from '../../mock-cv/analysis/mock-cv-interview-overview.service';
import { MOCK_CV_INTERVIEW_OVERVIEW_PROMPT_VERSION } from '../../mock-cv/analysis/prompts/mock-cv-interview-overview.prompt';
import {
  calculateMockScoreAverages,
  mockScoreErrorMessage,
  topMockKeywords,
} from '../../mock-core/utils/mock-score.util';
import { GENERIC_AI_JOB_FAILURE_MESSAGE } from '../ai-jobs.constants';
import type { MockCvInterviewOverviewJobData } from '../ai-jobs.types';
import { AiCreditsService } from '../../ai-credits/ai-credits.service';
import { aiCreditReservationKey } from '../../ai-credits/ai-credit-pricing';

/** Tổng hợp điểm đã có thành kết quả Mock CV; AI lỗi thì vẫn lưu fallback deterministic. */
@Injectable()
export class MockCvInterviewOverviewJobHandler {
  private readonly logger = new Logger(MockCvInterviewOverviewJobHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly overviewService: MockCvInterviewOverviewService,
    private readonly websocket: WebsocketGateway,
    private readonly aiCredits: AiCreditsService,
  ) {}

  /** Đọc snapshot + Score, gọi overview prompt và CAS kết quả vào đúng interview đang SUBMITTED. */
  async process(job: Job<MockCvInterviewOverviewJobData>): Promise<void> {
    const { mockCvInterviewId, userId } = job.data;
    const creditKey = aiCreditReservationKey(
      AiCreditFeature.MOCK_CV_OVERVIEW,
      'MOCK_CV_INTERVIEW',
      mockCvInterviewId,
    );
    await this.aiCredits.extendByIdempotencyKey(creditKey);
    const interview = await this.prisma.mockCvInterview.findFirst({
      where: {
        id: mockCvInterviewId,
        userId,
        status: MockInterviewStatus.SUBMITTED,
      },
      select: {
        id: true,
        title: true,
        totalQuestions: true,
        mockCv: {
          select: {
            targetRole: true,
            analysis: { select: { summary: true, claimsToVerify: true } },
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            content: true,
            focusArea: true,
            session: { select: { score: true } },
          },
        },
      },
    });
    if (!interview) return;

    const scored = interview.questions.flatMap((question) =>
      question.session?.score
        ? [{ question, score: question.session.score }]
        : [],
    );
    const averages =
      scored.length > 0
        ? calculateMockScoreAverages(scored.map((item) => item.score))
        : {
            averageTechnicalScore: null,
            averageCompletenessScore: null,
            averageClarityScore: null,
            overallScore: null,
          };

    let overview: {
      readiness: MockCvReadiness;
      summary: string;
      strengths: string[];
      weaknesses: string[];
      claimsToPrepareEvidence: string[];
      nextRecommendations: string[];
    };
    let overviewStatus: MockOverviewStatus = MockOverviewStatus.GENERATED;
    let overviewError: string | null = null;
    try {
      if (scored.length === 0) {
        throw new Error('Không có câu nào được chấm thành công.');
      }
      overview = await this.overviewService.generate({
        targetRole: interview.mockCv.targetRole,
        profileSummary: interview.mockCv.analysis?.summary ?? '',
        claimsToVerify: interview.mockCv.analysis?.claimsToVerify ?? [],
        questionScores: interview.questions.map((question) => ({
          question: question.content,
          focusArea: question.focusArea,
          technicalScore: question.session?.score?.technicalScore ?? null,
          completenessScore: question.session?.score?.completenessScore ?? null,
          clarityScore: question.session?.score?.clarityScore ?? null,
          summary: question.session?.score?.summary ?? null,
          improvements: question.session?.score?.improvements ?? [],
        })),
      });
    } catch (error) {
      overview = this.buildFallback(interview, averages.overallScore);
      overviewStatus = MockOverviewStatus.FALLBACK;
      overviewError = mockScoreErrorMessage(
        error,
        GENERIC_AI_JOB_FAILURE_MESSAGE,
      );
    }

    const updated = await this.prisma.mockCvInterview.updateMany({
      where: { id: interview.id, status: MockInterviewStatus.SUBMITTED },
      data: {
        status: MockInterviewStatus.SCORED,
        scoredAt: new Date(),
        ...averages,
        ...overview,
        overviewStatus,
        overviewError,
        overviewPromptVersion: MOCK_CV_INTERVIEW_OVERVIEW_PROMPT_VERSION,
      },
    });
    if (updated.count === 0) return;
    if (overviewStatus === MockOverviewStatus.GENERATED) {
      await this.aiCredits.consumeByIdempotencyKey(creditKey);
    } else {
      await this.aiCredits.releaseByIdempotencyKey(
        creditKey,
        'DeepSeek overview lỗi; hệ thống chỉ lưu fallback.',
      );
    }
    this.websocket.emitToUser(userId, 'mock-cv-interview:scored', {
      mockCvInterviewId,
    });
  }

  /** Đánh dấu overview FAILED khi job gặp lỗi ngoài phần AI fallback, để user có thể retry. */
  async onFailed(job: Job<MockCvInterviewOverviewJobData>): Promise<void> {
    await this.aiCredits.releaseByIdempotencyKey(
      aiCreditReservationKey(
        AiCreditFeature.MOCK_CV_OVERVIEW,
        'MOCK_CV_INTERVIEW',
        job.data.mockCvInterviewId,
      ),
      'Job overview Mock CV thất bại.',
    );
    await this.prisma.mockCvInterview.updateMany({
      where: {
        id: job.data.mockCvInterviewId,
        userId: job.data.userId,
        status: MockInterviewStatus.SUBMITTED,
      },
      data: {
        overviewStatus: MockOverviewStatus.FAILED,
        overviewError: GENERIC_AI_JOB_FAILURE_MESSAGE,
      },
    });
    this.logger.error(
      `Job overview Mock CV ${job.data.mockCvInterviewId} thất bại: ${job.failedReason}`,
    );
    this.websocket.emitToUser(job.data.userId, 'mock-cv-interview:failed', {
      mockCvInterviewId: job.data.mockCvInterviewId,
      message: GENERIC_AI_JOB_FAILURE_MESSAGE,
    });
  }

  /** Tạo kết quả tối thiểu từ điểm đã có; không để lỗi overview làm mất toàn bộ bài chấm. */
  private buildFallback(
    interview: {
      totalQuestions: number;
      questions: Array<{
        order: number;
        session: { score: { missedKeywords: string[] } | null } | null;
      }>;
    },
    overallScore: number | null,
  ) {
    const missed = topMockKeywords(
      interview.questions.flatMap(
        (question) => question.session?.score?.missedKeywords ?? [],
      ),
    );
    const readiness =
      overallScore === null || overallScore < 5
        ? MockCvReadiness.NOT_READY
        : overallScore < 7.5
          ? MockCvReadiness.NEEDS_PRACTICE
          : MockCvReadiness.READY;
    return {
      readiness,
      summary:
        overallScore === null
          ? 'Chưa có câu trả lời nào được chấm thành công.'
          : `Bạn đã hoàn thành bài phỏng vấn CV với điểm trung bình ${overallScore}.`,
      strengths:
        overallScore !== null && overallScore >= 7
          ? ['Các câu đã chấm cho thấy nền tảng trả lời khá ổn.']
          : [],
      weaknesses:
        missed.length > 0
          ? [`Bạn còn thiếu các ý quan trọng: ${missed.join(', ')}.`]
          : ['Một số câu trả lời cần đầy đủ và rõ ý hơn.'],
      claimsToPrepareEvidence: [],
      nextRecommendations: [
        `Ôn lại các câu trả lời còn yếu và chuẩn bị ví dụ cụ thể cho lần phỏng vấn tiếp theo.`,
      ],
    };
  }
}
