import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq, { toFile } from 'groq-sdk';

@Injectable()
export class SpeechService {
  private readonly groq: Groq;
  private readonly logger = new Logger(SpeechService.name);

  constructor(private config: ConfigService) {
    this.groq = new Groq({
      apiKey: this.config.getOrThrow<string>('groq.apiKey'),
    });
  }

  /**
   * Transcribe an audio file using Groq Whisper (whisper-large-v3-turbo).
   * Language is auto-detected. Returns the recognized text.
   */
  async transcribe(file: Express.Multer.File): Promise<{ transcript: string }> {
    try {
      const audioFile = await toFile(file.buffer, file.originalname, {
        type: file.mimetype,
      });

      const result = await this.groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3-turbo',
        response_format: 'json',
      });

      return { transcript: result.text.trim() };
    } catch (err) {
      this.logger.error(`Groq transcription failed: ${String(err)}`);

      // Rate limit / quota hết hạn mức trong ngày → 429
      if (err instanceof Groq.RateLimitError) {
        throw new HttpException(
          'Hệ thống đã đạt giới hạn phiên âm trong ngày. Vui lòng thử lại sau.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Sai/thiếu API key (lỗi cấu hình phía server)
      if (err instanceof Groq.AuthenticationError) {
        throw new ServiceUnavailableException(
          'Dịch vụ phiên âm tạm thời không khả dụng. Vui lòng thử lại sau.',
        );
      }

      // Không kết nối được tới Groq
      if (err instanceof Groq.APIConnectionError) {
        throw new ServiceUnavailableException(
          'Không kết nối được tới dịch vụ phiên âm. Vui lòng thử lại sau.',
        );
      }

      throw new InternalServerErrorException(
        'Không thể phiên âm audio. Vui lòng thử lại.',
      );
    }
  }
}
