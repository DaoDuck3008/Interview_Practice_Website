import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * Cache-aside mỏng trên Redis dùng chung (REDIS_CLIENT). Mọi lỗi Redis đều bị
 * nuốt và fail-open (đọc thẳng DB qua fn()) để một sự cố cache không kéo sập
 * cả API — Redis instance này còn phục vụ refresh-token allowlist.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Lỗi đọc cache "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Lỗi ghi cache "${key}": ${(err as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(
        `Lỗi xoá cache "${keys.join(', ')}": ${(err as Error).message}`,
      );
    }
  }

  /** Trả cache nếu có; ngược lại chạy fn(), lưu kết quả với TTL rồi trả về. */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
