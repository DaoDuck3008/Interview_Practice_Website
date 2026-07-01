import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DeepSeekClient } from './deepseek.client';
import {
  IMPROVEMENT_SYSTEM_PROMPT,
  buildImprovementUserPrompt,
  type Annotation,
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
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      this.logger.error(
        `DeepSeek trả về không phải JSON: ${raw.slice(0, 200)}`,
      );
      throw this.invalid();
    }
    return this.normalize(obj);
  }

  /**
   * Chuẩn hóa + validate output của DeepSeek. `response_format: json_object` chỉ
   * đảm bảo JSON hợp lệ, KHÔNG đảm bảo đúng schema — nên phải tự kiểm tra để tránh
   * lỗi thô (vd `.filter` trên field thiếu) khi field bị thiếu/sai kiểu.
   */
  private normalize(obj: unknown): ImprovementResult {
    if (typeof obj !== 'object' || obj === null) throw this.invalid();

    const r = obj as Record<string, unknown>;
    const improvedAnswer =
      typeof r.improvedAnswer === 'string' ? r.improvedAnswer.trim() : '';
    if (!improvedAnswer) throw this.invalid();

    return {
      improvedAnswer,
      annotations: this.toAnnotations(r.annotations),
      keyChanges: this.toStringArray(r.keyChanges),
    };
  }

  private toAnnotations(v: unknown): Annotation[] {
    if (!Array.isArray(v)) return [];
    return v.filter((a): a is Annotation => {
      if (typeof a !== 'object' || a === null) return false;
      const o = a as Record<string, unknown>;
      return (
        typeof o.originalSegment === 'string' &&
        typeof o.issue === 'string' &&
        typeof o.suggestion === 'string'
      );
    });
  }

  private toStringArray(v: unknown): string[] {
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string')
      : [];
  }

  private invalid(): InternalServerErrorException {
    this.logger.error('DeepSeek schema sai (thiếu improvedAnswer hoặc không phải object)');
    return new InternalServerErrorException(
      'Kết quả cải thiện không hợp lệ. Vui lòng thử lại.',
    );
  }
}
