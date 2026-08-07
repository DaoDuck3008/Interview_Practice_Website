/**
 * Vai trò file: chứa phép tính/trạng thái chấm điểm dùng chung, không gọi DB hoặc AI.
 * Được các scoring service trong ai-jobs dùng, nhưng mỗi loại mock giữ overview riêng.
 */
import { HttpException } from '@nestjs/common';
import { MockQuestionScoreStatus } from '@prisma/client';

export interface MockScoreInput {
  technicalScore: number;
  completenessScore: number;
  clarityScore: number;
}

/**
 * Tính trung bình ba tiêu chí và overallScore, tất cả được làm tròn một chữ số.
 * Caller chỉ gọi khi có ít nhất một Score hợp lệ.
 */
export function calculateMockScoreAverages(scores: MockScoreInput[]) {
  const count = scores.length;
  const averageTechnicalScore = round1(
    scores.reduce((sum, score) => sum + score.technicalScore, 0) / count,
  );
  const averageCompletenessScore = round1(
    scores.reduce((sum, score) => sum + score.completenessScore, 0) / count,
  );
  const averageClarityScore = round1(
    scores.reduce((sum, score) => sum + score.clarityScore, 0) / count,
  );
  const overallScore = round1(
    (averageTechnicalScore +
      averageCompletenessScore +
      averageClarityScore) /
      3,
  );
  return {
    averageTechnicalScore,
    averageCompletenessScore,
    averageClarityScore,
    overallScore,
  };
}

/** Kiểm tra câu đã kết thúc chấm, gồm SCORED, FAILED hoặc SKIPPED. */
export function isTerminalMockScoreStatus(
  status: MockQuestionScoreStatus,
): boolean {
  return (
    status === MockQuestionScoreStatus.SCORED ||
    status === MockQuestionScoreStatus.FAILED ||
    status === MockQuestionScoreStatus.SKIPPED
  );
}

/**
 * Đếm keyword không rỗng, sắp theo tần suất giảm dần và lấy tối đa `take` phần tử.
 * Dùng để tạo fallback overview khi AI tổng hợp gặp lỗi.
 */
export function topMockKeywords(values: string[], take = 4): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, take)
    .map(([key]) => key);
}

/**
 * Lấy message an toàn từ HttpException/Error; với giá trị lỗi không xác định
 * thì dùng fallbackMessage để không lưu chuỗi nội bộ hoặc `[object Object]`.
 */
export function mockScoreErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return error instanceof HttpException || error instanceof Error
    ? error.message
    : fallbackMessage;
}

/** Làm tròn số về một chữ số thập phân cho các giá trị điểm tổng hợp. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
