import { ConflictException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { MockAnswerLockService } from './mock-answer-lock.service';

/**
 * Vai trò: kiểm tra ownership token của Redis lock và trường hợp card đang được xử lý.
 * Redis được mock hoàn toàn; test bảo vệ service mà MockInterviewsService đang dùng.
 */
describe('MockAnswerLockService', () => {
  it('acquire và chỉ release bằng đúng value đã cấp', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };
    const service = new MockAnswerLockService(redis as unknown as Redis);
    const lock = await service.acquire('lock:mock-answer:question-1');
    await service.release(lock);
    expect(lock.value).toEqual(expect.any(String));
    expect(redis.set).toHaveBeenCalledWith(
      lock.key,
      lock.value,
      'EX',
      300,
      'NX',
    );
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      lock.key,
      lock.value,
    );
  });

  it('từ chối khi câu hỏi đã có request khác giữ lock', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue(null),
      eval: jest.fn(),
    };
    const service = new MockAnswerLockService(redis as unknown as Redis);
    await expect(
      service.acquire('lock:mock-answer:question-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(redis.eval).not.toHaveBeenCalled();
  });
});
