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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { fileUploadOptions } from '../../common/upload/file-upload.options';

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB — Groq audio API limit

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
  create(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateSessionDto,
  ) {
    if (!file) throw new BadRequestException('Không có file audio được gửi lên.');
    return this.sessions.create(user.id, file, dto);
  }

  @Post(':id/score')
  score(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.score(id, user.id);
  }
}
