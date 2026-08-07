import { Injectable, Logger } from '@nestjs/common';
import {
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionScoreStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  isTerminalMockScoreStatus,
  mockScoreErrorMessage,
} from '../../mock-core/utils/mock-score.util';
import { AiJobsService } from '../ai-jobs.service';
import { GENERIC_AI_JOB_FAILURE_MESSAGE } from '../ai-jobs.constants';

/** Theo dõi trạng thái score từng câu Mock CV và enqueue overview đúng một lần khi tất cả đã terminal. */
@Injectable()
export class MockCvInterviewScoringService {
  private readonly logger = new Logger(MockCvInterviewScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiJobs: AiJobsService,
  ) {}

  /** Đánh dấu câu SCORED rồi kiểm tra toàn bài đã sẵn sàng tổng hợp chưa. */
  async markSuccess(sessionId: string): Promise<void> {
    const item = await this.prisma.mockCvInterviewQuestion.findUnique({
      where: { sessionId },
      select: { mockCvInterviewId: true },
    });
    if (!item) return;
    await this.prisma.mockCvInterviewQuestion.update({
      where: { sessionId },
      data: { scoreStatus: MockQuestionScoreStatus.SCORED, scoreError: null },
    });
    await this.tryQueueOverview(item.mockCvInterviewId);
  }

  /** Đánh dấu câu FAILED bằng message an toàn; FAILED vẫn là terminal để overview có thể tạo kết quả phần còn lại. */
  async markFailure(sessionId: string, error: unknown): Promise<void> {
    const item = await this.prisma.mockCvInterviewQuestion.findUnique({
      where: { sessionId },
      select: { mockCvInterviewId: true },
    });
    if (!item) return;
    await this.prisma.mockCvInterviewQuestion.update({
      where: { sessionId },
      data: {
        scoreStatus: MockQuestionScoreStatus.FAILED,
        scoreError: mockScoreErrorMessage(
          error,
          GENERIC_AI_JOB_FAILURE_MESSAGE,
        ),
      },
    });
    await this.tryQueueOverview(item.mockCvInterviewId);
  }

  /** CAS SCORING -> SUBMITTED để chỉ worker cuối cùng được quyền enqueue overview. */
  private async tryQueueOverview(interviewId: string): Promise<void> {
    const interview = await this.prisma.mockCvInterview.findUnique({
      where: { id: interviewId },
      select: {
        userId: true,
        status: true,
        questions: { select: { scoreStatus: true } },
      },
    });
    if (!interview || interview.status !== MockInterviewStatus.SCORING) return;
    if (
      interview.questions.some(
        (question) => !isTerminalMockScoreStatus(question.scoreStatus),
      )
    ) {
      return;
    }

    const claimed = await this.prisma.mockCvInterview.updateMany({
      where: {
        id: interviewId,
        status: MockInterviewStatus.SCORING,
        overviewStatus: MockOverviewStatus.PENDING,
      },
      data: { status: MockInterviewStatus.SUBMITTED },
    });
    if (claimed.count === 0) return;

    try {
      await this.aiJobs.enqueueMockCvInterviewOverview(
        interviewId,
        interview.userId,
      );
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
}
