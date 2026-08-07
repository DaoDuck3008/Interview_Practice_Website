import { ConflictException } from '@nestjs/common';
import {
  MockInterviewStatus,
  MockQuestionScoreStatus,
} from '@prisma/client';
import {
  MOCK_ANSWER_GRACE_MS,
  MOCK_SCORING_RETRY_COOLDOWN_MS,
  MOCK_SCORING_STALE_MS,
} from './mock-core.constants';
import { assertMockCanAnswer } from './utils/mock-deadline.util';
import {
  isMockScoringStale,
  mockScoringRetryWaitSeconds,
} from './utils/mock-retry.util';
import {
  calculateMockScoreAverages,
  isTerminalMockScoreStatus,
  topMockKeywords,
} from './utils/mock-score.util';

/**
 * Vai trò: khóa hành vi các pure rule của mock-core trước khi Mock CV dùng lại.
 * Test trực tiếp constants/deadline/retry/score utilities, không gọi DB, Redis hay AI.
 */
describe('mock-core utilities', () => {
  it('cho phép câu trả lời nằm đúng trong grace window', () => {
    const expiresAt = new Date('2026-08-07T00:00:00.000Z');
    expect(() =>
      assertMockCanAnswer(
        { status: MockInterviewStatus.IN_PROGRESS, expiresAt },
        expiresAt.getTime() + MOCK_ANSWER_GRACE_MS,
      ),
    ).not.toThrow();
  });

  it('từ chối câu trả lời sau grace window', () => {
    const expiresAt = new Date('2026-08-07T00:00:00.000Z');
    expect(() =>
      assertMockCanAnswer(
        { status: MockInterviewStatus.IN_PROGRESS, expiresAt },
        expiresAt.getTime() + MOCK_ANSWER_GRACE_MS + 1,
      ),
    ).toThrow(ConflictException);
  });

  it('xác định scoring stale đúng tại ranh giới', () => {
    const now = new Date('2026-08-07T00:10:00.000Z');
    expect(
      isMockScoringStale(
        {
          status: MockInterviewStatus.SCORING,
          updatedAt: new Date(now.getTime() - MOCK_SCORING_STALE_MS),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isMockScoringStale(
        {
          status: MockInterviewStatus.SCORED,
          updatedAt: new Date(now.getTime() - MOCK_SCORING_STALE_MS),
        },
        now,
      ),
    ).toBe(false);
  });

  it('tính số giây cooldown retry còn lại', () => {
    const now = new Date('2026-08-07T00:10:00.000Z');
    expect(
      mockScoringRetryWaitSeconds(
        new Date(now.getTime() - MOCK_SCORING_RETRY_COOLDOWN_MS + 1_500),
        now,
      ),
    ).toBe(2);
    expect(
      mockScoringRetryWaitSeconds(
        new Date(now.getTime() - MOCK_SCORING_RETRY_COOLDOWN_MS),
        now,
      ),
    ).toBe(0);
  });

  it('tính điểm trung bình và trạng thái terminal dùng chung', () => {
    expect(
      calculateMockScoreAverages([
        { technicalScore: 7, completenessScore: 6, clarityScore: 8 },
        { technicalScore: 8, completenessScore: 9, clarityScore: 7 },
      ]),
    ).toEqual({
      averageTechnicalScore: 7.5,
      averageCompletenessScore: 7.5,
      averageClarityScore: 7.5,
      overallScore: 7.5,
    });
    expect(isTerminalMockScoreStatus(MockQuestionScoreStatus.SCORED)).toBe(
      true,
    );
    expect(isTerminalMockScoreStatus(MockQuestionScoreStatus.QUEUED)).toBe(
      false,
    );
  });

  it('xếp keyword theo số lần bị thiếu', () => {
    expect(
      topMockKeywords(['Redis', 'SQL', 'Redis', '', 'SQL', 'Redis']),
    ).toEqual(['Redis', 'SQL']);
  });
});
