import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DeepSeekClient } from './deepseek.client';
import {
  SCORING_SYSTEM_PROMPT,
  buildScoringUserPrompt,
  type QuestionInput,
  type ScoreResult,
} from './prompts/scoring.prompt';

type ParsedScore = Omit<ScoreResult, 'overallScore'>;

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

    return { ...parsed, overallScore };
  }

  private callDeepSeek(userPrompt: string): Promise<string> {
    return this.deepseek.call({
      systemPrompt: SCORING_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3,
    });
  }

  private parse(raw: string): ParsedScore {
    try {
      return JSON.parse(raw) as ParsedScore;
    } catch {
      this.logger.error(
        `DeepSeek trả về không phải JSON: ${raw.slice(0, 200)}`,
      );
      throw new InternalServerErrorException(
        'Kết quả chấm điểm không hợp lệ. Vui lòng thử lại.',
      );
    }
  }
}
