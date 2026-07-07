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
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { MAX_AUDIO_BYTES } from '../../common/upload/audio.constants';
import { ConcurrencyInterceptor } from '../../common/concurrency/concurrency.interceptor';
import { THROTTLE_HEAVY_UPLOAD } from '../../common/throttling/throttle-profiles';

@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

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
  transcribe(@UploadedFile() file: Express.Multer.File) {
    if (!file)
      throw new BadRequestException('Không có file audio được gửi lên.');
    return this.speechService.transcribe(file);
  }
}
