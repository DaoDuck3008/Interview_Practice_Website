import { BadRequestException } from '@nestjs/common';
import type { QuotaService } from '../../quota/quota.service';
import type { SpeechService } from '../../speech/speech.service';
import type { StorageService } from '../../storage/storage.service';
import { MockAnswerMediaService } from './mock-answer-media.service';

/**
 * Vai trò: bảo vệ pipeline và cleanup tài nguyên của MockAnswerMediaService.
 * Dùng mock Quota/Speech/Storage nên không gọi DB, Groq hay R2 thật.
 */
describe('MockAnswerMediaService', () => {
  const reservation = { id: 'reservation-1', userId: 'user-1' };
  const file = {
    buffer: Buffer.from('audio'),
    mimetype: 'audio/webm',
  } as Express.Multer.File;

  function setup() {
    const quota = {
      reserve: jest.fn().mockResolvedValue(reservation),
      cancel: jest.fn().mockResolvedValue(undefined),
      consumeInTransaction: jest.fn().mockResolvedValue(undefined),
      invalidateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const speech = {
      transcribe: jest.fn().mockResolvedValue({
        transcript: 'Câu trả lời',
        duration: 42,
      }),
    };
    const storage = {
      uploadStream: jest.fn().mockResolvedValue('https://cdn/audio.webm'),
      keyFromUrl: jest.fn().mockReturnValue('sessions/user-1/audio.webm'),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MockAnswerMediaService(
      quota as unknown as QuotaService,
      speech as unknown as SpeechService,
      storage as unknown as StorageService,
    );
    return { service, quota, speech, storage };
  }

  it('giữ quota, phiên âm và upload audio thành công', async () => {
    const { service, quota, speech, storage } = setup();
    await expect(
      service.prepare({
        userId: 'user-1',
        file,
        reportedDuration: 40,
        logContext: 'test answer',
      }),
    ).resolves.toEqual({
      audioUrl: 'https://cdn/audio.webm',
      transcript: 'Câu trả lời',
      duration: 42,
      reservation,
    });
    expect(quota.reserve).toHaveBeenCalledWith('user-1');
    expect(speech.transcribe).toHaveBeenCalledWith(file);
    expect(storage.uploadStream).toHaveBeenCalledTimes(1);
    expect(quota.cancel).not.toHaveBeenCalled();
  });

  it('hủy reservation khi audio vượt giới hạn trước lúc upload', async () => {
    const { service, quota, speech, storage } = setup();
    speech.transcribe.mockResolvedValue({ transcript: 'Quá dài', duration: 241 });
    await expect(
      service.prepare({
        userId: 'user-1',
        file,
        reportedDuration: 241,
        logContext: 'test answer',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(quota.cancel).toHaveBeenCalledWith(reservation);
    expect(storage.uploadStream).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('xóa audio và hủy reservation khi domain transaction chưa commit', async () => {
    const { service, quota, storage } = setup();
    const prepared = await service.prepare({
      userId: 'user-1',
      file,
      reportedDuration: 40,
      logContext: 'test answer',
    });
    await service.discard(prepared, 'test answer');
    expect(storage.keyFromUrl).toHaveBeenCalledWith(prepared.audioUrl);
    expect(storage.delete).toHaveBeenCalledWith(
      'sessions/user-1/audio.webm',
    );
    expect(quota.cancel).toHaveBeenCalledWith(reservation);
  });
});
