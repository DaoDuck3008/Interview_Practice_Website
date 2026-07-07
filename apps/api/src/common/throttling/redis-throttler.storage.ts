import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ThrottlerStorage } from '@nestjs/throttler';
import { REDIS_CLIENT } from '../../redis/redis.module';

// Một Lua script giữ việc tăng bộ đếm, set TTL và tạo trạng thái block trong cùng một thao tác atomic.
const INCREMENT_SCRIPT = `
local counterKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  local total = tonumber(redis.call('GET', counterKey) or limit)
  local counterTtl = redis.call('PTTL', counterKey)
  if counterTtl < 0 then
    counterTtl = ttl
  end
  return { total, counterTtl, 1, blockTtl }
end

local total = redis.call('INCR', counterKey)
if total == 1 then
  redis.call('PEXPIRE', counterKey, ttl)
end

local counterTtl = redis.call('PTTL', counterKey)
if counterTtl < 0 then
  redis.call('PEXPIRE', counterKey, ttl)
  counterTtl = ttl
end

if total > limit then
  local effectiveBlock = blockDuration > 0 and blockDuration or counterTtl
  redis.call('SET', blockKey, '1', 'PX', effectiveBlock)
  return { total, counterTtl, 1, effectiveBlock }
end

return { total, counterTtl, 0, 0 }
`;

interface RedisThrottlerRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

function splitProfileKey(key: string, throttlerName: string) {
  const [profile, ...rest] = key.split(':');
  if (rest.length === 0) {
    return { profile: throttlerName, key };
  }
  return { profile, key: rest.join(':') };
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<RedisThrottlerRecord> {
    // Route-specific profiles tự gắn nhãn vào key (vd auth-login:Auth.login:hash).
    // Tách nhãn đó ra để Redis dễ đọc: throttle:auth-login:hits:Auth.login:hash.
    const parsed = splitProfileKey(key, throttlerName);
    const counterKey = `throttle:${parsed.profile}:hits:${parsed.key}`;
    const blockKey = `throttle:${parsed.profile}:block:${parsed.key}`;

    const result = (await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      counterKey,
      blockKey,
      ttl,
      limit,
      blockDuration,
    )) as [number, number, number, number];

    return {
      totalHits: Number(result[0] ?? 0),
      timeToExpire: Number(result[1] ?? ttl),
      isBlocked: Number(result[2] ?? 0) === 1,
      timeToBlockExpire: Number(result[3] ?? 0),
    };
  }
}
