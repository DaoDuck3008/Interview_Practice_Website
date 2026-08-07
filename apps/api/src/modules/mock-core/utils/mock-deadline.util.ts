/**
 * Vai trò file: áp dụng cùng quy tắc trạng thái/deadline trước khi nhận câu trả lời.
 * Dùng constants từ mock-core; được MockInterviewsService và MockCvInterviewsService gọi.
 */
import { ConflictException } from '@nestjs/common';
import { MockInterviewStatus } from '@prisma/client';
import { MOCK_ANSWER_GRACE_MS } from '../mock-core.constants';

/**
 * Kiểm tra mock đang IN_PROGRESS, có expiresAt và request chưa vượt grace window.
 * `nowMs` có thể truyền vào để test chính xác các thời điểm sát ranh giới.
 */
export function assertMockCanAnswer(
  mock: {
    status: MockInterviewStatus;
    expiresAt: Date | null;
  },
  nowMs = Date.now(),
): void {
  if (mock.status !== MockInterviewStatus.IN_PROGRESS) {
    throw new ConflictException(
      'Mock interview chưa bắt đầu hoặc đã kết thúc.',
    );
  }
  if (!mock.expiresAt) {
    throw new ConflictException('Mock interview chưa có thời gian kết thúc.');
  }
  if (nowMs > mock.expiresAt.getTime() + MOCK_ANSWER_GRACE_MS) {
    throw new ConflictException('Đã hết thời gian, vui lòng nộp bài.');
  }
}
