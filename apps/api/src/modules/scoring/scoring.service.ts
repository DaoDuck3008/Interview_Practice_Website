import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DeepSeekClient } from './deepseek.client';
import {
  SCORING_SYSTEM_PROMPT,
  SCORING_PROMPT_VERSION,
  buildScoringUserPrompt,
  type QuestionInput,
  type ScoreResult,
} from './prompts/scoring.prompt';
import {
  MOCK_INTERVIEW_OVERVIEW_PROMPT_VERSION,
  MOCK_INTERVIEW_OVERVIEW_SYSTEM_PROMPT,
  buildMockInterviewOverviewUserPrompt,
  type MockInterviewOverviewInput,
  type MockInterviewOverviewResult,
} from './prompts/mock-interview-overview.prompt';

type ParsedScore = Omit<ScoreResult, 'overallScore' | 'promptVersion'>;

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private deepseek: DeepSeekClient) {}

  /**
   * Chấm điểm transcript bằng DeepSeek. Tách system/user message để tận dụng prompt cache.
   * Tự tính overallScore (trung bình 3 tiêu chí, làm tròn 1 chữ số).
   */
  async score(
    transcript: string,
    question: QuestionInput,
  ): Promise<ScoreResult> {
    const userPrompt = buildScoringUserPrompt(transcript, question);

    let parsed: ParsedScore;
    try {
      parsed = this.parse(await this.callDeepSeek(userPrompt));
    } catch (err) {
      // Retry 1 lần nếu JSON trả về không hợp lệ (lỗi mạng/429 thì ném thẳng)
      if (err instanceof InternalServerErrorException) {
        parsed = this.parse(await this.callDeepSeek(userPrompt));
      } else {
        throw err;
      }
    }

    const overallScore =
      Math.round(
        ((parsed.technicalScore +
          parsed.completenessScore +
          parsed.clarityScore) /
          3) *
          10,
      ) / 10;

    return { ...parsed, overallScore, promptVersion: SCORING_PROMPT_VERSION };
  }

  // Tổng hợp overview mock interview từ các câu đã chấm. Nếu LLM trả về JSON không hợp lệ thì ném lỗi để retry 1 lần.
  // Dùng bởi ai-jobs.processor.ts để lưu vào mock interview tổng quan.
  async mockInterviewOverview(
    input: MockInterviewOverviewInput,
  ): Promise<MockInterviewOverviewResult> {
    const raw = await this.deepseek.call({
      systemPrompt: MOCK_INTERVIEW_OVERVIEW_SYSTEM_PROMPT,
      userPrompt: buildMockInterviewOverviewUserPrompt(input),
      temperature: 0.25,
    });
    const parsed = this.parseOverview(raw);
    return {
      ...parsed,
      promptVersion: MOCK_INTERVIEW_OVERVIEW_PROMPT_VERSION,
    };
  }

  private callDeepSeek(userPrompt: string): Promise<string> {
    return this.deepseek.call({
      systemPrompt: SCORING_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3,
    });
  }

  private parse(raw: string): ParsedScore {
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      this.logger.error(
        `DeepSeek trả về không phải JSON: ${raw.slice(0, 200)}`,
      );
      throw new InternalServerErrorException(
        'Kết quả chấm điểm không hợp lệ. Vui lòng thử lại.',
      );
    }
    return this.normalize(obj);
  }

  /* Chuẩn hóa + validate output của DeepSeek. `response_format: json_object` chỉ đảm bảo JSON hợp lệ, KHÔNG đảm bảo đúng schema.
   Nên phải tự kiểm tra để tránh 500 (thiếu field) hay điểm tràn khung (>10). Schema sai -> ném để retry 1 lần.
  */
  private parseOverview(
    raw: string,
  ): Omit<MockInterviewOverviewResult, 'promptVersion'> {
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      this.logger.error(
        `DeepSeek tráº£ vá» overview khÃ´ng pháº£i JSON: ${raw.slice(0, 200)}`,
      );
      throw new InternalServerErrorException(
        'Káº¿t quáº£ tá»•ng há»£p mock interview khÃ´ng há»£p lá»‡.',
      );
    }

    if (typeof obj !== 'object' || obj === null) {
      throw this.invalid('overview khÃ´ng pháº£i object');
    }
    const r = obj as Record<string, unknown>;
    const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
    if (!summary) throw this.invalid('overview thiáº¿u summary');

    return {
      summary,
      strengths: this.toStringArray(r.strengths).slice(0, 4),
      weaknesses: this.toStringArray(r.weaknesses).slice(0, 4),
      nextRecommendations: this.toStringArray(r.nextRecommendations).slice(
        0,
        4,
      ),
    };
  }

  /**
   * Chuẩn hóa + validate output của DeepSeek. `response_format: json_object` chỉ
   * đảm bảo JSON hợp lệ, KHÔNG đảm bảo đúng schema — nên phải tự kiểm tra để tránh
   * 500 (thiếu field) hay điểm tràn khung (>10). Schema sai -> ném để retry 1 lần.
   */
  private normalize(obj: unknown): ParsedScore {
    if (typeof obj !== 'object' || obj === null) {
      throw this.invalid('không phải object');
    }
    const r = obj as Record<string, unknown>;
    const feedback =
      typeof r.feedback === 'object' && r.feedback !== null
        ? (r.feedback as Record<string, unknown>)
        : {};

    const technicalScore = this.toScore(r.technicalScore);
    const completenessScore = this.toScore(r.completenessScore);
    const clarityScore = this.toScore(r.clarityScore);
    const summary =
      typeof feedback.summary === 'string' ? feedback.summary.trim() : '';

    if (
      technicalScore === null ||
      completenessScore === null ||
      clarityScore === null ||
      !summary
    ) {
      throw this.invalid('thiếu điểm hoặc nhận xét');
    }

    return {
      technicalScore,
      completenessScore,
      clarityScore,
      matchedKeywords: this.toStringArray(r.matchedKeywords),
      missedKeywords: this.toStringArray(r.missedKeywords),
      feedback: {
        summary,
        improvements: this.toStringArray(feedback.improvements),
      },
    };
  }

  /** Ép về số nguyên trong [0, 10]; trả null nếu không phải số hợp lệ. */
  private toScore(v: unknown): number | null {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(10, Math.max(0, Math.round(n)));
  }

  private toStringArray(v: unknown): string[] {
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string')
      : [];
  }

  private invalid(reason: string): InternalServerErrorException {
    this.logger.error(`DeepSeek schema sai (${reason})`);
    return new InternalServerErrorException(
      'Hệ thống chấm điểm gặp lỗi. Vui lòng thử lại.',
    );
  }
}
