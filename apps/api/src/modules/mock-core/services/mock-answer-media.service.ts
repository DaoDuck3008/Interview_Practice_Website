import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AiCreditFeature } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MAX_AUDIO_DURATION_SEC } from '../../../common/upload/audio.constants';
import { AiCreditsService } from '../../ai-credits/ai-credits.service';
import { aiCreditReservationKey } from '../../ai-credits/ai-credit-pricing';
import { SpeechService } from '../../speech/speech.service';
import { StorageService } from '../../storage/storage.service';

export interface PreparedMockAnswerMedia {
  audioUrl: string;
  transcript: string;
  duration: number;
  creditKey: string;
}

/**
 * Vai trò: dùng chung pipeline credit reservation -> Whisper -> R2 và cleanup nếu chưa commit Session.
 * Phụ thuộc AiCreditsService, SpeechService, StorageService; MockInterviewsService chỉ giữ
 * transaction Prisma đặc thù domain, MockCvInterviewsService sẽ tái sử dụng pipeline này.
 */
@Injectable()
export class MockAnswerMediaService {
  private readonly logger = new Logger(MockAnswerMediaService.name);

  constructor(
    private readonly aiCredits: AiCreditsService,
    private readonly speech: SpeechService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Giữ quota trước, phiên âm audio, kiểm tra thời lượng rồi upload lên R2.
   * Nếu bất kỳ bước nào lỗi, hàm tự hủy reservation và xóa audio đã upload best-effort.
   */
  async prepare(input: {
    userId: string;
    file: Express.Multer.File;
    reportedDuration: number;
    sessionId: string;
    logContext: string;
  }): Promise<PreparedMockAnswerMedia> {
    const creditKey = aiCreditReservationKey(
      AiCreditFeature.ANSWER_AUDIO,
      'SESSION',
      input.sessionId,
    );
    await this.aiCredits.reserve({
      userId: input.userId,
      feature: AiCreditFeature.ANSWER_AUDIO,
      referenceType: 'SESSION',
      referenceId: input.sessionId,
      idempotencyKey: creditKey,
    });
    let audioUrl: string | undefined;

    try {
      const { transcript, duration: measuredDuration } =
        await this.speech.transcribe(input.file);
      if (
        measuredDuration !== null &&
        measuredDuration > MAX_AUDIO_DURATION_SEC
      ) {
        throw new BadRequestException('Audio không được vượt quá 4 phút.');
      }

      const key = `sessions/${input.userId}/${randomUUID()}.webm`;
      audioUrl = await this.storage.uploadStream(
        key,
        input.file.buffer,
        input.file.mimetype,
      );
      return {
        audioUrl,
        transcript,
        duration: measuredDuration ?? input.reportedDuration,
        creditKey,
      };
    } catch (error) {
      await this.cleanupResources({ audioUrl, creditKey }, input.logContext);
      throw error;
    }
  }

  /**
   * Dọn audio và release credit khi domain transaction thất bại sau bước prepare().
   * Cleanup là best-effort và không che mất lỗi nghiệp vụ ban đầu.
   */
  async discard(
    prepared: PreparedMockAnswerMedia,
    logContext: string,
  ): Promise<void> {
    await this.cleanupResources(
      { audioUrl: prepared.audioUrl, creditKey: prepared.creditKey },
      logContext,
    );
  }

  /** Mock dài giữ reservation tới lúc auto-submit; audio thường vẫn dùng TTL ngắn mặc định. */
  extendUntil(prepared: PreparedMockAnswerMedia, minimumExpiresAt: Date) {
    return this.aiCredits.extendByIdempotencyKey(
      prepared.creditKey,
      minimumExpiresAt,
    );
  }

  async deleteStoredAudio(audioUrls: string[]): Promise<void> {
    await Promise.all(
      audioUrls.map((audioUrl) =>
        this.storage.delete(this.storage.keyFromUrl(audioUrl)),
      ),
    );
  }

  /**
   * Chạy xóa R2 và release credit song song; từng lỗi cleanup được log riêng
   * để một tài nguyên lỗi không ngăn việc dọn tài nguyên còn lại.
   */
  private async cleanupResources(
    resources: {
      audioUrl: string | undefined;
      creditKey: string;
    },
    logContext: string,
  ): Promise<void> {
    const results = await Promise.allSettled([
      resources.audioUrl
        ? this.storage.delete(this.storage.keyFromUrl(resources.audioUrl))
        : Promise.resolve(),
      this.aiCredits.releaseByIdempotencyKey(
        resources.creditKey,
        `Không tạo được câu trả lời mock (${logContext}).`,
      ),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Cleanup ${logContext} thất bại: ${String(result.reason)}`,
        );
      }
    }
  }
}
