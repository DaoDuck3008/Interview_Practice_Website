import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_TIMEOUT_MS = 15_000;

// Lỗi mạng/timeout/quá tải thường chỉ tạm thời -> thử lại 1 lần. Lỗi cấu hình
// (401 sai key, 402 hết hạn mức) sẽ KHÔNG được retry vì thử lại cũng không giải quyết được.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

interface CallParams {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  timeoutMs?: number;
}

/** Đánh dấu lỗi có thể thử lại — bọc sẵn exception cuối cùng sẽ ném ra nếu hết lượt retry. */
class TransientDeepSeekError extends Error {
  constructor(public readonly finalError: ServiceUnavailableException) {
    super('transient-deepseek-error');
  }
}

/** Client dùng chung cho mọi service gọi DeepSeek (scoring, improvement, Mock CV...). */
@Injectable()
export class DeepSeekClient {
  private readonly apiKey: string;
  private readonly logger = new Logger(DeepSeekClient.name);

  constructor(private config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('deepseek.apiKey');
  }

  /**
   * Gọi DeepSeek. Tự thử lại tối đa 1 lần nếu lỗi mạng/timeout/429/5xx (lỗi tạm
   * thời), không retry lỗi cấu hình (401/402) hay lỗi khác vì retry vô ích.
   */
  async call(params: CallParams): Promise<string> {
    let lastTransient: TransientDeepSeekError | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attemptCall(params);
      } catch (err) {
        if (!(err instanceof TransientDeepSeekError)) throw err;

        lastTransient = err;
        if (attempt === MAX_ATTEMPTS) break;

        this.logger.warn(
          `DeepSeek lỗi tạm thời (lần ${attempt}/${MAX_ATTEMPTS}), thử lại sau ${RETRY_DELAY_MS}ms...`,
        );
        await sleep(RETRY_DELAY_MS);
      }
    }

    throw lastTransient!.finalError;
  }

  private async attemptCall({
    systemPrompt,
    userPrompt,
    temperature,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: CallParams): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

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
        const finalError = new ServiceUnavailableException(
          this.messageForStatus(res.status),
        );
        if (RETRYABLE_STATUSES.has(res.status)) {
          throw new TransientDeepSeekError(finalError);
        }
        throw finalError;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      if (err instanceof TransientDeepSeekError) throw err;
      if (err instanceof ServiceUnavailableException) throw err;

      this.logger.error(`DeepSeek call failed: ${String(err)}`);
      // Lỗi không tới được server (mất mạng, DNS, abort do timeout) — coi là tạm thời.
      throw new TransientDeepSeekError(
        new ServiceUnavailableException(
          'Không kết nối được dịch vụ AI. Vui lòng thử lại sau.',
        ),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private messageForStatus(status: number): string {
    switch (status) {
      case 429: // Rate limit — gọi quá nhanh
        return 'Hệ thống AI đang quá tải. Vui lòng thử lại sau.';
      case 402: // Hết số dư / quota — cần nạp thêm credit DeepSeek
        return 'Hệ thống tạm hết hạn mức xử lý. Vui lòng thử lại sau.';
      case 401: // Sai/thiếu API key — lỗi cấu hình phía server
        return 'Dịch vụ AI chưa được cấu hình đúng. Vui lòng thử lại sau.';
      default: // 400/422/500/503...
        return 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.';
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
