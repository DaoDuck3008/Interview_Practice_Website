import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

const CONSUME_REFRESH_TOKEN_SCRIPT = `
local key = KEYS[1]
if redis.call('EXISTS', key) == 0 then
  return 0
end
redis.call('DEL', key)
return 1
`;

/**
 * Allowlist refresh token theo từng phiên (jti) trên Redis.
 * Key: refresh:<userId>:<jti>.
 * userId - id người dùng
 * jti - id của phiên
 * TTL - thời gian sống của phiên
 * Mỗi key tự hết hạn theo TTL = thời gian sống còn lại của refresh token.
 */
@Injectable()
export class RefreshTokenStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(userId: string, jti: string) {
    return `refresh:${userId}:${jti}`;
  }

  async store(userId: string, jti: string, ttlSeconds: number) {
    if (ttlSeconds <= 0) return;
    await this.redis.set(this.key(userId, jti), '1', 'EX', ttlSeconds);
  }

  async exists(userId: string, jti: string): Promise<boolean> {
    return (await this.redis.exists(this.key(userId, jti))) === 1;
  }

  /**
   * Dùng khi refresh token: kiểm tra token cũ còn hợp lệ và xóa ngay trong
   * cùng một thao tác Redis. Nhờ vậy, nếu có 2 request refresh song song bằng
   * cùng token cũ thì chỉ request đầu tiên được cấp token mới.
   */
  async consume(userId: string, jti: string): Promise<boolean> {
    const result = await this.redis.eval(
      CONSUME_REFRESH_TOKEN_SCRIPT,
      1,
      this.key(userId, jti),
    );
    return result === 1;
  }

  async remove(userId: string, jti: string) {
    await this.redis.del(this.key(userId, jti));
  }

  /** Thu hồi TẤT CẢ phiên của user (dùng khi khóa tài khoản / đổi mật khẩu). */
  async removeAll(userId: string) {
    const pattern = `refresh:${userId}:*`;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length) await this.redis.del(...keys);
    } while (cursor !== '0');
  }
}
