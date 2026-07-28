import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { QuotaService } from '../quota/quota.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { MAX_AUDIO_BYTES } from '../../common/upload/audio.constants';
import { ConcurrencyInterceptor } from '../../common/concurrency/concurrency.interceptor';
import { THROTTLE_HEAVY_UPLOAD } from '../../common/throttling/throttle-profiles';

@Controller('speech')
export class SpeechController {
  constructor(
    private readonly speechService: SpeechService,
    private readonly quota: QuotaService,
  ) {}

  @UseGuards(JwtAuthGuard, QuotaGuard)
  @Post('transcribe')
  @Throttle(THROTTLE_HEAVY_UPLOAD)
  @UseInterceptors(
    ConcurrencyInterceptor,
    FileInterceptor(
      'audio',
      fileUploadOptions({
        mimePrefix: 'audio/',
        maxSize: MAX_AUDIO_BYTES,
        errorMessage: 'Định dạng audio không hợp lệ.',
      }),
    ),
  )
  async transcribe(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException('Không có file audio được gửi lên.');
    // Guard chỉ kiểm tra nhanh; reservation dưới đây mới chặn race trước khi gọi Whisper.
    const reservation = await this.quota.reserve(user.id);
    try {
      const result = await this.speechService.transcribe(file);
      await this.quota.consume(reservation);
      return result;
    } catch (err) {
      await this.quota.cancel(reservation);
      throw err;
    }
  }
}
