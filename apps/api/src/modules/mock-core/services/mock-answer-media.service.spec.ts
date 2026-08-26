import { BadRequestException } from '@nestjs/common';
import type { AiCreditsService } from '../../ai-credits/ai-credits.service';
import type { SpeechService } from '../../speech/speech.service';
import type { StorageService } from '../../storage/storage.service';
import { MockAnswerMediaService } from './mock-answer-media.service';

/**
 * Vai trò: bảo vệ pipeline và cleanup tài nguyên của MockAnswerMediaService.
 * Dùng mock AI Credits/Speech/Storage nên không gọi DB, Groq hay R2 thật.
 */
describe('MockAnswerMediaService', () => {
  const file = {
    buffer: Buffer.from('audio'),
    mimetype: 'audio/webm',
  } as Express.Multer.File;

  function setup() {
    const aiCredits = {
      reserve: jest.fn().mockResolvedValue(undefined),
      releaseByIdempotencyKey: jest.fn().mockResolvedValue(undefined),
      extendByIdempotencyKey: jest.fn().mockResolvedValue(undefined),
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
      aiCredits as unknown as AiCreditsService,
      speech as unknown as SpeechService,
      storage as unknown as StorageService,
    );
    return { service, aiCredits, speech, storage };
  }

  it('giữ credit, phiên âm và upload audio thành công', async () => {
    const { service, aiCredits, speech, storage } = setup();
    await expect(
      service.prepare({
        userId: 'user-1',
        file,
        reportedDuration: 40,
        sessionId: 'session-1',
        logContext: 'test answer',
      }),
    ).resolves.toEqual({
      audioUrl: 'https://cdn/audio.webm',
      transcript: 'Câu trả lời',
      duration: 42,
      creditKey: 'ANSWER_AUDIO:SESSION:session-1',
    });
    expect(aiCredits.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', referenceId: 'session-1' }),
    );
    expect(speech.transcribe).toHaveBeenCalledWith(file);
    expect(storage.uploadStream).toHaveBeenCalledTimes(1);
    expect(aiCredits.releaseByIdempotencyKey).not.toHaveBeenCalled();
  });

  it('hủy reservation khi audio vượt giới hạn trước lúc upload', async () => {
    const { service, aiCredits, speech, storage } = setup();
    speech.transcribe.mockResolvedValue({
      transcript: 'Quá dài',
      duration: 241,
    });
    await expect(
      service.prepare({
        userId: 'user-1',
        file,
        reportedDuration: 241,
        sessionId: 'session-1',
        logContext: 'test answer',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(aiCredits.releaseByIdempotencyKey).toHaveBeenCalled();
    expect(storage.uploadStream).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('xóa audio và hủy reservation khi domain transaction chưa commit', async () => {
    const { service, aiCredits, storage } = setup();
    const prepared = await service.prepare({
      userId: 'user-1',
      file,
      reportedDuration: 40,
      sessionId: 'session-1',
      logContext: 'test answer',
    });
    await service.discard(prepared, 'test answer');
    expect(storage.keyFromUrl).toHaveBeenCalledWith(prepared.audioUrl);
    expect(storage.delete).toHaveBeenCalledWith('sessions/user-1/audio.webm');
    expect(aiCredits.releaseByIdempotencyKey).toHaveBeenCalled();
  });

  it('gia hạn reservation cho tới hạn nộp của phòng mock', async () => {
    const { service, aiCredits } = setup();
    const prepared = await service.prepare({
      userId: 'user-1',
      file,
      reportedDuration: 40,
      sessionId: 'session-1',
      logContext: 'test answer',
    });
    const minimumExpiresAt = new Date('2026-08-26T00:00:00.000Z');

    await service.extendUntil(prepared, minimumExpiresAt);

    expect(aiCredits.extendByIdempotencyKey).toHaveBeenCalledWith(
      prepared.creditKey,
      minimumExpiresAt,
    );
  });
});
