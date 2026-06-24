import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

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

  async remove(userId: string, jti: string) {
    await this.redis.del(this.key(userId, jti));
  }
}
