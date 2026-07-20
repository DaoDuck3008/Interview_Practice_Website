import {
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
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConcurrencyInterceptor } from '../../common/concurrency/concurrency.interceptor';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { MAX_AUDIO_BYTES } from '../../common/upload/audio.constants';
import {
  THROTTLE_AI_ACTION,
  THROTTLE_HEAVY_UPLOAD,
} from '../../common/throttling/throttle-profiles';
import { MockInterviewsService } from './mock-interviews.service';
import { CreateMockInterviewDto } from './dto/create-mock-interview.dto';
import { QueryMockInterviewDto } from './dto/query-mock-interview.dto';
import { AnswerMockQuestionDto } from './dto/answer-mock-question.dto';

interface AuthUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('mock-interviews')
export class MockInterviewsController {
  constructor(private mockInterviews: MockInterviewsService) {}

  @Post()
  @Throttle(THROTTLE_AI_ACTION)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMockInterviewDto) {
    return this.mockInterviews.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryMockInterviewDto) {
    return this.mockInterviews.findAll(user.id, query);
  }

  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockInterviews.start(id, user.id);
  }

  @Post(':id/questions/:questionItemId/answer')
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
  answer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('questionItemId') questionItemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnswerMockQuestionDto,
  ) {
    return this.mockInterviews.answer(
      id,
      questionItemId,
      user.id,
      file,
      dto.duration,
    );
  }

  @Post(':id/submit')
  @Throttle(THROTTLE_AI_ACTION)
  @UseInterceptors(ConcurrencyInterceptor)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockInterviews.submit(id, user.id);
  }

  @Get(':id/result')
  getResult(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockInterviews.getResult(id, user.id);
  }

  @Get(':id')
  getOwned(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockInterviews.getOwned(id, user.id);
  }
}
