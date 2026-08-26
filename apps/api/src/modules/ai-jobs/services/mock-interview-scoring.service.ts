import { Injectable } from '@nestjs/common';
import {
  AiCreditFeature,
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionScoreStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import { ScoringService } from '../../scoring/scoring.service';
import type { MockInterviewOverviewInput } from '../../scoring/prompts/mock-interview-overview.prompt';
import {
  calculateMockScoreAverages,
  isTerminalMockScoreStatus,
  mockScoreErrorMessage,
  topMockKeywords,
} from '../../mock-core/utils/mock-score.util';
import { GENERIC_AI_JOB_FAILURE_MESSAGE } from '../ai-jobs.constants';
import { AiCreditsService } from '../../ai-credits/ai-credits.service';
import { aiCreditReservationKey } from '../../ai-credits/ai-credit-pricing';

/**
 * Quản lý trạng thái chấm từng câu và tổng hợp overview của Mock Interview thường.
 * Được ScoreJobHandler gọi sau mỗi job score; dùng phép tính/trạng thái chung từ mock-core
 * nhưng vẫn giữ query Prisma và prompt overview đặc thù của Mock Interview thường.
 */
@Injectable()
export class MockInterviewScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly websocket: WebsocketGateway,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async markSuccess(sessionId: string, chargeOverview = true) {
    const item = await this.prisma.mockInterviewQuestion.findUnique({
      where: { sessionId },
      select: { mockInterviewId: true },
    });
    if (!item) return;

    await this.prisma.mockInterviewQuestion.update({
      where: { sessionId },
      data: { scoreStatus: MockQuestionScoreStatus.SCORED, scoreError: null },
    });
    await this.completeIfReady(item.mockInterviewId, chargeOverview);
  }

  async markFailure(sessionId: string, error: unknown, chargeOverview = true) {
    const item = await this.prisma.mockInterviewQuestion.findUnique({
      where: { sessionId },
      select: { mockInterviewId: true },
    });
    if (!item) return;

    await this.prisma.mockInterviewQuestion.update({
      where: { sessionId },
      data: {
        scoreStatus: MockQuestionScoreStatus.FAILED,
        scoreError: mockScoreErrorMessage(
          error,
          GENERIC_AI_JOB_FAILURE_MESSAGE,
        ),
      },
    });
    await this.completeIfReady(item.mockInterviewId, chargeOverview);
  }

  private async completeIfReady(
    mockInterviewId: string,
    chargeOverview: boolean,
  ) {
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

    if (
      mock.questions.some(
        (item) => !isTerminalMockScoreStatus(item.scoreStatus),
      )
    ) {
      return;
    }

    // Chỉ một job được quyền tổng hợp overview khi nhiều câu hoàn thành cùng lúc.
    const lock = await this.prisma.mockInterview.updateMany({
      where: { id: mockInterviewId, status: MockInterviewStatus.SCORING },
      data: { status: MockInterviewStatus.SUBMITTED },
    });
    if (lock.count === 0) return;

    const scored = mock.questions.filter((item) => item.session?.score);
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
      this.emitScored(mock.userId, mockInterviewId);
      return;
    }

    const averages = calculateMockScoreAverages(
      scored.map((item) => item.session!.score!),
    );
    const overviewInput: MockInterviewOverviewInput = {
      title: mock.title,
      topics: mock.topicLinks.map((link) => link.topic.name),
      durationSeconds: mock.durationSeconds,
      answeredQuestions: scored.length,
      totalQuestions: mock.totalQuestions,
      ...averages,
      scores: scored.map((item) => ({
        order: item.order,
        question: item.question.content,
        technicalScore: item.session!.score!.technicalScore,
        completenessScore: item.session!.score!.completenessScore,
        clarityScore: item.session!.score!.clarityScore,
        summary: item.session!.score!.summary,
        improvements: item.session!.score!.improvements,
        matchedKeywords: item.session!.score!.matchedKeywords,
        missedKeywords: item.session!.score!.missedKeywords,
      })),
    };

    const creditKey = aiCreditReservationKey(
      AiCreditFeature.MOCK_INTERVIEW_OVERVIEW,
      'MOCK_INTERVIEW',
      mockInterviewId,
    );
    try {
      if (chargeOverview) {
        await this.aiCredits.reserve({
          userId: mock.userId,
          feature: AiCreditFeature.MOCK_INTERVIEW_OVERVIEW,
          referenceType: 'MOCK_INTERVIEW',
          referenceId: mockInterviewId,
          idempotencyKey: creditKey,
        });
      }
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
      await this.aiCredits.consumeByIdempotencyKey(creditKey);
    } catch (error) {
      await this.aiCredits.releaseByIdempotencyKey(
        creditKey,
        'Không tạo được AI overview cho Mock Interview.',
      );
      await this.prisma.mockInterview.update({
        where: { id: mockInterviewId },
        data: {
          status: MockInterviewStatus.SCORED,
          scoredAt: new Date(),
          ...averages,
          ...buildFallbackOverview(overviewInput),
          overviewStatus: MockOverviewStatus.FALLBACK,
          overviewError: mockScoreErrorMessage(
            error,
            GENERIC_AI_JOB_FAILURE_MESSAGE,
          ),
        },
      });
    }
    this.emitScored(mock.userId, mockInterviewId);
  }

  private emitScored(userId: string, mockInterviewId: string) {
    this.websocket.emitToUser(userId, 'mock-interview:scored', {
      mockInterviewId,
    });
  }
}

function buildFallbackOverview(input: MockInterviewOverviewInput) {
  const missed = topMockKeywords(
    input.scores.flatMap((score) => score.missedKeywords),
  );
  const weakQuestions = input.scores
    .map((score) => ({
      label: `Câu ${score.order}`,
      score:
        (score.technicalScore + score.completenessScore + score.clarityScore) /
        3,
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 2)
    .map((question) => question.label);

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
