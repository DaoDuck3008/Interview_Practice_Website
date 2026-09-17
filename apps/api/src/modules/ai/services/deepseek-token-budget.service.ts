import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { vnDayKey } from '../../../common/utils/vn-time.util';
import { REDIS_CLIENT } from '../../../redis/redis.module';

const COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60;

/**
 * Giới hạn token DeepSeek cho toàn hệ thống theo ngày Việt Nam. Không reserve
 * trước call; vì vậy có thể vượt nhẹ bằng số request đang chạy đồng thời.
 */
@Injectable()
export class DeepSeekTokenBudgetService {
  private readonly logger = new Logger(DeepSeekTokenBudgetService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async assertAvailable(now = new Date()): Promise<void> {
    const [inputKey, outputKey] = this.keys(now);
    try {
      const [inputRaw, outputRaw] = await this.redis.mget(inputKey, outputKey);
      const inputTokens = this.toCounter(inputRaw);
      const outputTokens = this.toCounter(outputRaw);

      if (inputTokens >= this.inputLimit || outputTokens >= this.outputLimit) {
        throw tokenLimitException();
      }
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        throw error;
      }
      this.logger.error(
        `Không đọc được hạn mức token DeepSeek: ${String(error)}`,
      );
      // Không gọi provider khi không kiểm tra được budget để tránh chi phí không kiểm soát.
      throw new ServiceUnavailableException(
        'Không thể kiểm tra hạn mức AI. Vui lòng thử lại sau.',
      );
    }
  }

  async recordUsage(
    inputTokens: number,
    outputTokens: number,
    now = new Date(),
  ): Promise<void> {
    const [inputKey, outputKey] = this.keys(now);
    const input = this.toUsage(inputTokens);
    const output = this.toUsage(outputTokens);

    try {
      const results = await this.redis
        .multi()
        .incrby(inputKey, input)
        .incrby(outputKey, output)
        .expire(inputKey, COUNTER_TTL_SECONDS)
        .expire(outputKey, COUNTER_TTL_SECONDS)
        .exec();

      const totalInput = this.toCounter(String(results?.[0]?.[1] ?? '0'));
      const totalOutput = this.toCounter(String(results?.[1]?.[1] ?? '0'));
      if (totalInput >= this.inputLimit || totalOutput >= this.outputLimit) {
        this.logger.warn(
          `Đã chạm hạn mức token DeepSeek ngày: input=${totalInput}/${this.inputLimit}, output=${totalOutput}/${this.outputLimit}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Không ghi được usage token DeepSeek: ${String(error)}`,
      );
      // Provider đã trả kết quả thành công; không ném lỗi để job không retry và phát sinh thêm chi phí.
      return;
    }
  }

  private get inputLimit() {
    return this.config.getOrThrow<number>('deepseek.dailyInputTokenLimit');
  }

  private get outputLimit() {
    return this.config.getOrThrow<number>('deepseek.dailyOutputTokenLimit');
  }

  private keys(now: Date): [string, string] {
    const day = vnDayKey(now);
    return [
      `deepseek:tokens:input:${day}`,
      `deepseek:tokens:output:${day}`,
    ];
  }

  private toCounter(value: string | null): number {
    const parsed = Number(value ?? 0);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  private toUsage(value: number): number {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
}

function tokenLimitException() {
  return new HttpException(
    'Hệ thống đã đạt hạn mức AI hôm nay. Vui lòng thử lại vào ngày mai.',
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
