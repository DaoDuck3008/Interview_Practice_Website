import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { fileUploadOptions } from '../../common/upload/file-upload.options';

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB — Groq audio API limit

@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  @UseGuards(JwtAuthGuard)
  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor(
      'audio',
      fileUploadOptions({
        mimePrefix: 'audio/',
        maxSize: MAX_SIZE,
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
