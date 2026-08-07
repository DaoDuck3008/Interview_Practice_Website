import {
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionScoreStatus,
} from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { AiJobsService } from '../ai-jobs.service';
import { MockCvInterviewScoringService } from './mock-cv-interview-scoring.service';

/** Bảo vệ CAS enqueue overview khi nhiều score job hoàn thành gần đồng thời. */
describe('MockCvInterviewScoringService', () => {
  function setup(questionStatuses: MockQuestionScoreStatus[]) {
    const prisma = {
      mockCvInterviewQuestion: {
        findUnique: jest.fn().mockResolvedValue({
          mockCvInterviewId: 'interview-1',
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      mockCvInterview: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'user-1',
          status: MockInterviewStatus.SCORING,
          questions: questionStatuses.map((scoreStatus) => ({ scoreStatus })),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const aiJobs = {
      enqueueMockCvInterviewOverview: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MockCvInterviewScoringService(
      prisma as unknown as PrismaService,
      aiJobs as unknown as AiJobsService,
    );
    return { service, prisma, aiJobs };
  }

  it('enqueue overview khi tất cả câu đã terminal', async () => {
    const { service, prisma, aiJobs } = setup([
      MockQuestionScoreStatus.SCORED,
      MockQuestionScoreStatus.FAILED,
      MockQuestionScoreStatus.SKIPPED,
    ]);

    await service.markSuccess('session-1');

    expect(prisma.mockCvInterview.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'interview-1',
        status: MockInterviewStatus.SCORING,
        overviewStatus: MockOverviewStatus.PENDING,
      },
      data: { status: MockInterviewStatus.SUBMITTED },
    });
    expect(aiJobs.enqueueMockCvInterviewOverview).toHaveBeenCalledWith(
      'interview-1',
      'user-1',
    );
  });

  it('không enqueue overview khi còn câu QUEUED', async () => {
    const { service, prisma, aiJobs } = setup([
      MockQuestionScoreStatus.SCORED,
      MockQuestionScoreStatus.QUEUED,
    ]);

    await service.markSuccess('session-1');

    expect(prisma.mockCvInterview.updateMany).not.toHaveBeenCalled();
    expect(aiJobs.enqueueMockCvInterviewOverview).not.toHaveBeenCalled();
  });

  it('chỉ worker thắng CAS mới enqueue overview', async () => {
    const { service, prisma, aiJobs } = setup([
      MockQuestionScoreStatus.SCORED,
    ]);
    prisma.mockCvInterview.updateMany.mockResolvedValue({ count: 0 });

    await service.markSuccess('session-1');

    expect(aiJobs.enqueueMockCvInterviewOverview).not.toHaveBeenCalled();
  });
});
