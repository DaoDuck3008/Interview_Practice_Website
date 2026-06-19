import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DeepSeekClient } from './deepseek.client';
import {
  IMPROVEMENT_SYSTEM_PROMPT,
  buildImprovementUserPrompt,
  type ImprovementResult,
} from './prompts/improvement.prompt';
import type { QuestionInput, ScoreResult } from './prompts/scoring.prompt';

@Injectable()
export class ImprovementService {
  private readonly logger = new Logger(ImprovementService.name);

  constructor(private deepseek: DeepSeekClient) {}

  /**
   * Viết lại câu trả lời tốt hơn dựa trên transcript gốc + kết quả chấm điểm.
   * Lọc annotations: chỉ giữ đoạn THẬT SỰ có trong transcript (phòng AI bịa segment).
   */
  async improve(
    transcript: string,
    question: QuestionInput,
    scoreResult: ScoreResult,
  ): Promise<ImprovementResult> {
    const userPrompt = buildImprovementUserPrompt(
      transcript,
      question,
      scoreResult,
    );

    let parsed: ImprovementResult;
    try {
      parsed = this.parse(await this.callDeepSeek(userPrompt));
    } catch (err) {
      if (err instanceof InternalServerErrorException) {
        parsed = this.parse(await this.callDeepSeek(userPrompt));
      } else {
        throw err;
      }
    }

    const annotations = parsed.annotations.filter((a) =>
      transcript.includes(a.originalSegment),
    );

    return { ...parsed, annotations };
  }

  private callDeepSeek(userPrompt: string): Promise<string> {
    return this.deepseek.call({
      systemPrompt: IMPROVEMENT_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.5,
    });
  }

  private parse(raw: string): ImprovementResult {
    try {
      return JSON.parse(raw) as ImprovementResult;
    } catch {
      this.logger.error(
        `DeepSeek trả về không phải JSON: ${raw.slice(0, 200)}`,
      );
      throw new InternalServerErrorException(
        'Kết quả cải thiện không hợp lệ. Vui lòng thử lại.',
      );
    }
  }
}
