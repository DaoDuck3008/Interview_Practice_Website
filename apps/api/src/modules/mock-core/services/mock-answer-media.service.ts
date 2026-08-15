import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MAX_AUDIO_DURATION_SEC } from '../../../common/upload/audio.constants';
import {
  QuotaService,
  type QuotaReservation,
} from '../../quota/quota.service';
import { SpeechService } from '../../speech/speech.service';
import { StorageService } from '../../storage/storage.service';

export interface PreparedMockAnswerMedia {
  audioUrl: string;
  transcript: string;
  duration: number;
  reservation: QuotaReservation;
}

/**
 * Vai trò: dùng chung pipeline quota -> Whisper -> R2 và cleanup nếu chưa commit Session.
 * Phụ thuộc QuotaService, SpeechService, StorageService; MockInterviewsService chỉ giữ
 * transaction Prisma đặc thù domain, MockCvInterviewsService sẽ tái sử dụng pipeline này.
 */
@Injectable()
export class MockAnswerMediaService {
  private readonly logger = new Logger(MockAnswerMediaService.name);

  constructor(
    private readonly quota: QuotaService,
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
    logContext: string;
  }): Promise<PreparedMockAnswerMedia> {
    const reservation = await this.quota.reserve(input.userId);
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
        reservation,
      };
    } catch (error) {
      await this.cleanupResources(
        { audioUrl, reservation },
        input.logContext,
      );
      throw error;
    }
  }

  /**
   * Chuyển reservation PENDING thành CONSUMED trong cùng transaction tạo Session.
   * Domain service gọi hàm này trước khi commit để Session và quota luôn nhất quán.
   */
  consumeInTransaction(
    tx: Prisma.TransactionClient,
    prepared: PreparedMockAnswerMedia,
    sessionId: string,
  ): Promise<void> {
    return this.quota.consumeInTransaction(
      tx,
      prepared.reservation.id,
      sessionId,
    );
  }

  /** Xóa cache quota sau khi transaction lưu Session đã commit thành công. */
  invalidateQuota(userId: string): Promise<void> {
    return this.quota.invalidateStatus(userId);
  }

  /**
   * Dọn audio và trả quota khi domain transaction thất bại sau bước prepare().
   * Cleanup là best-effort và không che mất lỗi nghiệp vụ ban đầu.
   */
  async discard(
    prepared: PreparedMockAnswerMedia,
    logContext: string,
  ): Promise<void> {
    await this.cleanupResources(
      { audioUrl: prepared.audioUrl, reservation: prepared.reservation },
      logContext,
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
   * Chạy xóa R2 và hủy quota song song; từng lỗi cleanup được log riêng
   * để một tài nguyên lỗi không ngăn việc dọn tài nguyên còn lại.
   */
  private async cleanupResources(
    resources: {
      audioUrl: string | undefined;
      reservation: QuotaReservation;
    },
    logContext: string,
  ): Promise<void> {
    const results = await Promise.allSettled([
      resources.audioUrl
        ? this.storage.delete(this.storage.keyFromUrl(resources.audioUrl))
        : Promise.resolve(),
      this.quota.cancel(resources.reservation),
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
