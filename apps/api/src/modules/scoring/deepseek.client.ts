import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const TIMEOUT_MS = 15_000;

interface CallParams {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

/** Client dùng chung cho mọi service gọi DeepSeek (scoring, improvement...). */
@Injectable()
export class DeepSeekClient {
  private readonly apiKey: string;
  private readonly logger = new Logger(DeepSeekClient.name);

  constructor(private config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('deepseek.apiKey');
  }

  async call({ systemPrompt, userPrompt, temperature }: CallParams): Promise<string> {
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
          temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
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
              'Hệ thống AI đang quá tải. Vui lòng thử lại sau.',
            );
          case 402: // Hết số dư / quota — cần nạp thêm credit DeepSeek
            throw new ServiceUnavailableException(
              'Hệ thống tạm hết hạn mức xử lý. Vui lòng thử lại sau.',
            );
          case 401: // Sai/thiếu API key — lỗi cấu hình phía server
            throw new ServiceUnavailableException(
              'Dịch vụ AI chưa được cấu hình đúng. Vui lòng thử lại sau.',
            );
          default: // 400/422/500/503...
            throw new ServiceUnavailableException(
              'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.',
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
        'Không kết nối được dịch vụ AI. Vui lòng thử lại sau.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
