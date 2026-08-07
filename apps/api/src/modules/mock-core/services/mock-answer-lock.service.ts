import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { MOCK_ANSWER_LOCK_TTL_SEC } from '../mock-core.constants';

export interface MockAnswerLock {
  key: string;
  value: string;
}

/**
 * Vai trò: acquire/release Redis lock cho một card câu hỏi, tránh hai upload song song.
 * Phụ thuộc REDIS_CLIENT và TTL trong mock-core.constants; hiện được
 * MockInterviewsService dùng, sau này MockCvInterviewsService dùng với key riêng.
 */
@Injectable()
export class MockAnswerLockService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Giữ lock theo key của card câu hỏi bằng lệnh SET NX có TTL.
   * Trả cả key/value để release chỉ xóa đúng lock do request hiện tại tạo ra.
   */
  async acquire(key: string): Promise<MockAnswerLock> {
    const value = randomUUID();
    const locked = await this.redis.set(
      key,
      value,
      'EX',
      MOCK_ANSWER_LOCK_TTL_SEC,
      'NX',
    );
    if (locked !== 'OK') {
      throw new ConflictException('Câu này đang được xử lý, vui lòng chờ.');
    }
    return { key, value };
  }

  /**
   * Xóa lock bằng Lua compare-and-delete; lock đã hết hạn hoặc đã thuộc request
   * khác sẽ được giữ nguyên để request cũ không xóa nhầm lock mới.
   */
  async release(lock: MockAnswerLock): Promise<void> {
    await this.redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      lock.key,
      lock.value,
    );
  }
}
