import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

const MOCK_CV_OPERATION_LOCK_TTL_SEC = 120;

export interface MockCvOperationLock {
  key: string;
  value: string;
}

@Injectable()
export class MockCvOperationLockService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async acquire(mockCvId: string): Promise<MockCvOperationLock> {
    const key = `lock:mock-cv-operation:${mockCvId}`;
    const value = randomUUID();
    const locked = await this.redis.set(
      key,
      value,
      'EX',
      MOCK_CV_OPERATION_LOCK_TTL_SEC,
      'NX',
    );
    if (locked !== 'OK') {
      throw new ConflictException('CV đang được xử lý, vui lòng thử lại sau.');
    }
    return { key, value };
  }

  async release(lock: MockCvOperationLock): Promise<void> {
    await this.redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      lock.key,
      lock.value,
    );
  }
}
