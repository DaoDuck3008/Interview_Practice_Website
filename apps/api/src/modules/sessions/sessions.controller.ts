import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { MAX_AUDIO_BYTES } from '../../common/upload/audio.constants';
import { ConcurrencyInterceptor } from '../../common/concurrency/concurrency.interceptor';

interface AuthUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  @Get()
  findByQuestion(
    @CurrentUser() user: AuthUser,
    @Query('questionId') questionId: string,
  ) {
    if (!questionId) throw new BadRequestException('Thiếu questionId.');
    return this.sessions.findByQuestion(user.id, questionId);
  }

  @Post()
  @UseGuards(QuotaGuard)
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
  create(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateSessionDto,
  ) {
    if (!file) throw new BadRequestException('Không có file audio được gửi lên.');
    return this.sessions.create(user.id, file, dto);
  }

  @Post(':id/score')
  @UseInterceptors(ConcurrencyInterceptor)
  score(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.score(id, user.id);
  }

  @Post(':id/improve')
  @UseInterceptors(ConcurrencyInterceptor)
  improve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.improve(id, user.id);
  }
}
