import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { DeepSeekClient } from '../ai/clients/deepseek.client';
import { StorageService } from '../storage/storage.service';
import {
  MAX_CV_PAGES,
  MAX_CV_TEXT_LENGTH,
  MIN_CV_TEXT_LENGTH,
  MOCK_CV_PROFILE_AI_TIMEOUT_MS,
} from './mock-cv.constants';
import {
  MOCK_CV_PROFILE_SYSTEM_PROMPT,
  buildMockCvProfileUserPrompt,
  type MockCvAvailableTopic,
  type MockCvProfileResult,
} from './prompts/mock-cv-profile.prompt';
import {
  InvalidMockCvProfileError,
  normalizeMockCvProfile,
  redactMockCvText,
} from './mock-cv-profile.utils';

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
    private readonly storage: StorageService,
    private readonly deepseek: DeepSeekClient,
  ) {}

  /* Service function: Phân tích CV bằng AI, trả về text đã trích xuất và profile chuẩn hóa.
  Nếu CV không hợp lệ, ném lỗi MockCvNeedsReuploadError.
  Hàm này chỉ được gọi khi field extractedText trong DB là null
 */
  async extractFromPrivateFile(fileKey: string): Promise<string> {
    const pdf = await this.storage.downloadPrivate(fileKey);
    return this.extractAndRedact(pdf);
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

  // Util function: Trích xuất text từ file PDF và che dữ liệu liên hệ. Nếu file không hợp lệ, ném lỗi MockCvNeedsReuploadError.
  private async extractAndRedact(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      if (info.total > MAX_CV_PAGES) {
        throw new MockCvNeedsReuploadError(
          `CV chỉ được tối đa ${MAX_CV_PAGES} trang. Vui lòng tải lên bản ngắn gọn hơn.`,
        );
      }

      const result = await parser.getText();
      const redacted = redactMockCvText(result.text).slice(
        0,
        MAX_CV_TEXT_LENGTH,
      );
      if (redacted.length < MIN_CV_TEXT_LENGTH) {
        throw new MockCvNeedsReuploadError(
          'Không đọc được đủ nội dung trong CV. Vui lòng tải lên file PDF có thể chọn và sao chép văn bản.',
          redacted || null,
        );
      }
      return redacted;
    } catch (error) {
      if (error instanceof MockCvNeedsReuploadError) throw error;
      throw new MockCvNeedsReuploadError(
        'Không thể đọc file PDF. Vui lòng kiểm tra file không bị khóa, hỏng hoặc chỉ chứa ảnh scan.',
      );
    } finally {
      await parser.destroy();
    }
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
