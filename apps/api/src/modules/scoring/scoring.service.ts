import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SCORING_SYSTEM_PROMPT,
  buildScoringUserPrompt,
  type QuestionInput,
  type ScoreResult,
} from './prompts/scoring.prompt';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const TIMEOUT_MS = 15_000;

type ParsedScore = Omit<ScoreResult, 'overallScore'>;

@Injectable()
export class ScoringService {
  private readonly apiKey: string;
  private readonly logger = new Logger(ScoringService.name);

  constructor(private config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('deepseek.apiKey');
  }

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

  // Hàm gọi DeepSeek AI dùng chung
  private async callDeepSeek(userPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SCORING_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`DeepSeek ${res.status}: ${body.slice(0, 300)}`);
        switch (res.status) {
          case 429: // Rate limit — gọi quá nhanh
            throw new ServiceUnavailableException(
              'Hệ thống chấm điểm đang quá tải. Vui lòng thử lại sau.',
            );
          case 402: // Hết số dư / quota — cần nạp thêm credit DeepSeek
            throw new ServiceUnavailableException(
              'Hệ thống tạm hết hạn mức chấm điểm. Vui lòng thử lại sau.',
            );
          case 401: // Sai/thiếu API key — lỗi cấu hình phía server
            throw new ServiceUnavailableException(
              'Dịch vụ chấm điểm chưa được cấu hình đúng. Vui lòng thử lại sau.',
            );
          default: // 400/422/500/503...
            throw new ServiceUnavailableException(
              'Dịch vụ chấm điểm tạm thời không khả dụng. Vui lòng thử lại sau.',
            );
        }
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`DeepSeek call failed: ${String(err)}`);
      throw new ServiceUnavailableException(
        'Không kết nối được dịch vụ chấm điểm. Vui lòng thử lại sau.',
      );
    } finally {
      clearTimeout(timer);
    }
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
