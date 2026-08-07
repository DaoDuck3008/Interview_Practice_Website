import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MockCvReadiness } from '@prisma/client';
import { DeepSeekClient } from '../ai/clients/deepseek.client';
import { MOCK_CV_OVERVIEW_AI_TIMEOUT_MS } from './mock-cv.constants';
import {
  MOCK_CV_INTERVIEW_OVERVIEW_SYSTEM_PROMPT,
  buildMockCvInterviewOverviewUserPrompt,
  type MockCvInterviewOverviewInput,
  type MockCvInterviewOverviewResult,
} from './prompts/mock-cv-interview-overview.prompt';

/** Gọi và validate prompt tổng hợp Mock CV; được overview job handler sử dụng. */
@Injectable()
export class MockCvInterviewOverviewService {
  private readonly logger = new Logger(MockCvInterviewOverviewService.name);

  constructor(private readonly deepseek: DeepSeekClient) {}

  /** Gọi lại đúng một lần khi AI trả JSON/schema sai; lỗi mạng đã do DeepSeekClient retry. */
  async generate(
    input: MockCvInterviewOverviewInput,
  ): Promise<MockCvInterviewOverviewResult> {
    const userPrompt = buildMockCvInterviewOverviewUserPrompt(input);
    try {
      return this.parse(await this.callDeepSeek(userPrompt));
    } catch (error) {
      if (!(error instanceof InternalServerErrorException)) throw error;
      return this.parse(await this.callDeepSeek(userPrompt));
    }
  }

  /** Thực hiện một request DeepSeek với timeout riêng của overview Mock CV. */
  private callDeepSeek(userPrompt: string): Promise<string> {
    return this.deepseek.call({
      systemPrompt: MOCK_CV_INTERVIEW_OVERVIEW_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.25,
      timeoutMs: MOCK_CV_OVERVIEW_AI_TIMEOUT_MS,
    });
  }

  /** Parse và giới hạn output trước khi dữ liệu được ghi vào MockCvInterview. */
  private parse(raw: string): MockCvInterviewOverviewResult {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw this.invalid('output không phải JSON');
    }
    if (!value || typeof value !== 'object') {
      throw this.invalid('output không phải object');
    }
    const result = value as Record<string, unknown>;
    const readiness = result.readiness;
    const summary =
      typeof result.summary === 'string' ? result.summary.trim() : '';
    if (
      readiness !== MockCvReadiness.NOT_READY &&
      readiness !== MockCvReadiness.NEEDS_PRACTICE &&
      readiness !== MockCvReadiness.READY
    ) {
      throw this.invalid('readiness không hợp lệ');
    }
    if (!summary) throw this.invalid('thiếu summary');

    return {
      readiness,
      summary: summary.slice(0, 2_000),
      strengths: this.toStringArray(result.strengths, 5),
      weaknesses: this.toStringArray(result.weaknesses, 5),
      claimsToPrepareEvidence: this.toStringArray(
        result.claimsToPrepareEvidence,
        8,
      ),
      nextRecommendations: this.toStringArray(
        result.nextRecommendations,
        5,
      ),
    };
  }

  /** Chuẩn hóa mảng chuỗi, bỏ phần tử rỗng và giới hạn số lượng/kích thước. */
  private toStringArray(value: unknown, take: number): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, 500))
      .filter(Boolean)
      .slice(0, take);
  }

  /** Tạo lỗi schema thống nhất mà không log raw prompt/CV hoặc output chứa dữ liệu user. */
  private invalid(reason: string) {
    this.logger.error(`DeepSeek schema overview Mock CV sai: ${reason}`);
    return new InternalServerErrorException(
      'Kết quả tổng hợp Mock CV không hợp lệ. Vui lòng thử lại.',
    );
  }
}
