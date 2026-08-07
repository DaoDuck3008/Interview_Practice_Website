/**
 * Vai trò file: tính stale/cooldown khi chấm lại mà không phụ thuộc Prisma model.
 * Dùng constants từ mock-core; được MockInterviewsService và MockCvInterviewsService gọi.
 */
import { MockInterviewStatus } from '@prisma/client';
import {
  MOCK_SCORING_RETRY_COOLDOWN_MS,
  MOCK_SCORING_STALE_MS,
} from '../mock-core.constants';

/**
 * Chỉ xem mock là stale khi vẫn SCORING và updatedAt đã quá ngưỡng cho phép.
 * Trạng thái khác luôn trả false dù updatedAt đã cũ.
 */
export function isMockScoringStale(
  mock: { status: MockInterviewStatus; updatedAt: Date },
  now = new Date(),
): boolean {
  return (
    mock.status === MockInterviewStatus.SCORING &&
    now.getTime() - mock.updatedAt.getTime() >= MOCK_SCORING_STALE_MS
  );
}

/**
 * Tính số giây cooldown retry còn lại từ lastRetryAt, làm tròn lên để message
 * không báo 0 giây quá sớm; trả 0 khi chưa retry hoặc cooldown đã kết thúc.
 */
export function mockScoringRetryWaitSeconds(
  lastRetryAt: Date | null,
  now = new Date(),
): number {
  if (!lastRetryAt) return 0;
  return Math.max(
    0,
    Math.ceil(
      (lastRetryAt.getTime() +
        MOCK_SCORING_RETRY_COOLDOWN_MS -
        now.getTime()) /
        1_000,
    ),
  );
}
