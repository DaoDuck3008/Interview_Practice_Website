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

const MAX_QUESTIONS_PER_AI_CALL = 5;

@Injectable()
export class MockCvQuestionGenerationService {
  constructor(private readonly deepseek: DeepSeekClient) {}

  async generate(
    input: MockCvQuestionGenerationInput,
  ): Promise<MockCvGeneratedQuestion[]> {
    if (input.requestedQuestionCount === 0) return [];

    const generated: MockCvGeneratedQuestion[] = [];
    while (generated.length < input.requestedQuestionCount) {
      const batchSize = Math.min(
        MAX_QUESTIONS_PER_AI_CALL,
        input.requestedQuestionCount - generated.length,
      );
      const batchInput: MockCvQuestionGenerationInput = {
        ...input,
        requestedQuestionCount: batchSize,
        selectedBankQuestions: [
          ...input.selectedBankQuestions,
          ...generated.map((question) => ({
            content: question.content,
            topicName: 'Câu hỏi đã sinh ở lượt trước',
            level: 'MEDIUM' as const,
          })),
        ],
      };
      generated.push(...(await this.generateBatch(batchInput)));
    }
    return generated;
  }

  private async generateBatch(
    input: MockCvQuestionGenerationInput,
  ): Promise<MockCvGeneratedQuestion[]> {
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
