import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { ScoreResult } from '../scoring/prompts/scoring.prompt';

/**
 * Dùng chung giữa nhánh "transcript rỗng" (đồng bộ, trong SessionsService) và
 * nhánh "AI trả điểm 0" (bất đồng bộ, trong AiJobsProcessor) — cả 2 đều cần
 * xóa session/audio + trả kết quả tạm khi tổng điểm bằng 0.
 */

/** Xóa session + file audio trên R2 (dùng khi không muốn lưu, vd điểm 0). */
export async function deleteSessionAndAudio(
  prisma: PrismaService,
  storage: StorageService,
  sessionId: string,
  audioUrl: string,
) {
  await prisma.session.delete({ where: { id: sessionId } });
  await storage.delete(storage.keyFromUrl(audioUrl));
}

/** Kết quả điểm 0 trả về cho frontend hiển thị nhưng KHÔNG persist (id rỗng). */
export function transientZeroScore(result: ScoreResult) {
  return {
    id: '',
    technicalScore: result.technicalScore,
    completenessScore: result.completenessScore,
    clarityScore: result.clarityScore,
    matchedKeywords: result.matchedKeywords,
    missedKeywords: result.missedKeywords,
    summary: result.feedback.summary,
    improvements: result.feedback.improvements,
  };
}
