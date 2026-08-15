import type { PrismaService } from '../../prisma/prisma.service';
import type { AiJobsService } from '../ai-jobs/ai-jobs.service';
import type { CacheService } from '../../cache/cache.service';
import type { MockAnswerLockService } from '../mock-core/services/mock-answer-lock.service';
import type { MockAnswerMediaService } from '../mock-core/services/mock-answer-media.service';
import type { MockInterviewJobsService } from './mock-interview-jobs.service';
import { MockInterviewsService } from './mock-interviews.service';

describe('MockInterviewsService', () => {
  it('tìm kiếm và phân trang lịch sử trực tiếp trong Prisma', async () => {
    const findMany = jest.fn().mockReturnValue(Promise.resolve([]));
    const count = jest.fn().mockReturnValue(Promise.resolve(13));
    const prisma = {
      mockInterview: { findMany, count },
      $transaction: jest.fn().mockResolvedValue([[], 13]),
    };
    const service = new MockInterviewsService(
      prisma as unknown as PrismaService,
      {} as MockAnswerMediaService,
      {} as MockAnswerLockService,
      {} as AiJobsService,
      {} as CacheService,
      {} as MockInterviewJobsService,
    );

    const result = await service.findAll('user-1', {
      page: 2,
      limit: 6,
      search: ' Node.js ',
      sortOrder: 'oldest',
    });

    const where = {
      userId: 'user-1',
      OR: [
        { title: { contains: 'Node.js', mode: 'insensitive' } },
        {
          topicLinks: {
            some: {
              topic: {
                name: { contains: 'Node.js', mode: 'insensitive' },
              },
            },
          },
        },
        {
          topic: {
            is: {
              name: { contains: 'Node.js', mode: 'insensitive' },
            },
          },
        },
      ],
    };
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        skip: 6,
        take: 6,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where });
    expect(result).toEqual({
      items: [],
      total: 13,
      page: 2,
      limit: 6,
      totalPages: 3,
    });
  });
});
