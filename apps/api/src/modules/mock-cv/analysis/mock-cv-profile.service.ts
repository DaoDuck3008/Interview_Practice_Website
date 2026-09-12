import { Injectable } from '@nestjs/common';
import { DeepSeekClient } from '../../ai/clients/deepseek.client';
import { MOCK_CV_PROFILE_AI_TIMEOUT_MS } from './mock-cv.constants';
import {
  MOCK_CV_PROFILE_SYSTEM_PROMPT,
  buildMockCvProfileUserPrompt,
  type MockCvAvailableTopic,
  type MockCvProfileResult,
} from './prompts/mock-cv-profile.prompt';
import {
  InvalidMockCvProfileError,
  normalizeMockCvProfile,
} from './mock-cv-profile.utils';
import { PdfExtractionSandboxService } from './pdf-extraction-sandbox.service';

export class MockCvNeedsReuploadError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly extractedText: string | null = null,
  ) {
    super(userMessage);
    this.name = 'MockCvNeedsReuploadError';
  }
}

interface AnalyzeMockCvTextInput {
  targetRole: string;
  cvText: string;
  availableTopics: MockCvAvailableTopic[];
}

@Injectable()
export class MockCvProfileService {
  constructor(
    private readonly deepseek: DeepSeekClient,
    private readonly pdfSandbox: PdfExtractionSandboxService,
  ) {}

  /* Service function: Phân tích CV bằng AI, trả về text đã trích xuất và profile chuẩn hóa.
  Nếu CV không hợp lệ, ném lỗi MockCvNeedsReuploadError.
  Hàm này chỉ được gọi khi field extractedText trong DB là null
 */
  async extractFromPrivateFile(fileKey: string): Promise<string> {
    try {
      return await this.pdfSandbox.extract(fileKey);
    } catch {
      throw new MockCvNeedsReuploadError(
        'Không thể đọc file PDF. Vui lòng kiểm tra file không bị khóa, hỏng hoặc chỉ chứa ảnh scan.',
      );
    }
  }

  /* Service function: Phân tích text CV bằng AI, trả về profile chuẩn hóa.
  Nếu AI trả về JSON không hợp lệ, gọi lại 1 lần nữa. Nếu vẫn không hợp lệ, ném lỗi InvalidMockCvProfileError.
  Hàm này chỉ được gọi khi field extractedText trong DB đã có giá trị (không null)
  */
  async analyzeText(
    input: AnalyzeMockCvTextInput,
  ): Promise<MockCvProfileResult> {
    const allowedTopicSlugs = new Set(
      input.availableTopics.map((topic) => topic.slug),
    );
    const userPrompt = buildMockCvProfileUserPrompt({
      targetRole: input.targetRole,
      cvText: input.cvText,
      availableTopics: input.availableTopics,
    });

    let profile: MockCvProfileResult;
    try {
      profile = normalizeMockCvProfile(
        await this.callDeepSeek(userPrompt),
        allowedTopicSlugs,
      );
    } catch (error) {
      // Chỉ gọi lại khi AI trả JSON sai schema; lỗi mạng/timeout đã được DeepSeekClient xử lý.
      if (!(error instanceof InvalidMockCvProfileError)) throw error;
      profile = normalizeMockCvProfile(
        await this.callDeepSeek(userPrompt),
        allowedTopicSlugs,
      );
    }

    return profile;
  }

  private callDeepSeek(userPrompt: string): Promise<string> {
    return this.deepseek.call({
      systemPrompt: MOCK_CV_PROFILE_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      timeoutMs: MOCK_CV_PROFILE_AI_TIMEOUT_MS,
    });
  }
}
