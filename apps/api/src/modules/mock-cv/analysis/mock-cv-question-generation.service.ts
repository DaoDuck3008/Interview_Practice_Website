import { Injectable } from '@nestjs/common';
import { DeepSeekClient } from '../../ai/clients/deepseek.client';
import { MOCK_CV_QUESTION_GENERATION_AI_TIMEOUT_MS } from './mock-cv.constants';
import {
  MOCK_CV_QUESTION_GENERATION_SYSTEM_PROMPT,
  buildMockCvQuestionGenerationUserPrompt,
  type MockCvGeneratedQuestion,
  type MockCvQuestionGenerationInput,
} from './prompts/mock-cv-question-generation.prompt';
import {
  InvalidMockCvQuestionGenerationError,
  normalizeMockCvGeneratedQuestions,
} from './mock-cv-question-generation.utils';

@Injectable()
export class MockCvQuestionGenerationService {
  constructor(private readonly deepseek: DeepSeekClient) {}

  async generate(
    input: MockCvQuestionGenerationInput,
  ): Promise<MockCvGeneratedQuestion[]> {
    if (input.requestedQuestionCount === 0) return [];

    const userPrompt = buildMockCvQuestionGenerationUserPrompt(input);
    const existingContents = input.selectedBankQuestions.map(
      (question) => question.content,
    );

    try {
      return normalizeMockCvGeneratedQuestions(
        await this.callDeepSeek(userPrompt),
        input.requestedQuestionCount,
        existingContents,
      );
    } catch (error) {
      // Chỉ yêu cầu AI tạo lại khi JSON/schema không hợp lệ; lỗi kết nối do client xử lý riêng.
      if (!(error instanceof InvalidMockCvQuestionGenerationError)) throw error;
      return normalizeMockCvGeneratedQuestions(
        await this.callDeepSeek(userPrompt),
        input.requestedQuestionCount,
        existingContents,
      );
    }
  }

  private callDeepSeek(userPrompt: string): Promise<string> {
    return this.deepseek.call({
      systemPrompt: MOCK_CV_QUESTION_GENERATION_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.35,
      timeoutMs: MOCK_CV_QUESTION_GENERATION_AI_TIMEOUT_MS,
    });
  }
}
