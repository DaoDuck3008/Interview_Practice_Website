import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConcurrencyInterceptor } from '../../../common/concurrency/concurrency.interceptor';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  THROTTLE_USER_AUDIO_UPLOAD,
  THROTTLE_USER_MOCK_SCORE_RETRY,
  THROTTLE_USER_MOCK_SUBMIT,
} from '../../../common/throttling/throttle-profiles';
import { MAX_AUDIO_BYTES } from '../../../common/upload/audio.constants';
import { fileUploadOptions } from '../../../common/upload/file-upload.options';
import { AnswerMockQuestionDto } from '../../mock-core/dto/answer-mock-question.dto';
import { MockCvInterviewsService } from './mock-cv-interviews.service';
import { UserActionThrottle } from '../../../common/throttling/user-action-throttle.decorator';
import { UserActionThrottlerGuard } from '../../../common/throttling/user-action-throttler.guard';

interface AuthUser {
  id: string;
}

/** API phòng làm bài Mock CV; việc chuẩn bị/tạo phòng vẫn đi qua POST /mock-cvs/:id/start. */
@UseGuards(JwtAuthGuard)
@Controller('mock-cv-interviews')
export class MockCvInterviewsController {
  constructor(private readonly interviews: MockCvInterviewsService) {}

  @Post(':id/questions/:questionItemId/answer')
  @UserActionThrottle(THROTTLE_USER_AUDIO_UPLOAD)
  @UseGuards(UserActionThrottlerGuard)
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
    return this.interviews.answer(
      id,
      questionItemId,
      user.id,
      file,
      dto.duration,
    );
  }

  @Post(':id/submit')
  @UserActionThrottle(THROTTLE_USER_MOCK_SUBMIT)
  @UseGuards(UserActionThrottlerGuard)
  @UseInterceptors(ConcurrencyInterceptor)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.interviews.submit(id, user.id);
  }

  @Post(':id/retry-scoring')
  @UserActionThrottle(THROTTLE_USER_MOCK_SCORE_RETRY)
  @UseGuards(UserActionThrottlerGuard)
  @UseInterceptors(ConcurrencyInterceptor)
  retryScoring(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.interviews.retryScoring(id, user.id);
  }

  @Get(':id/result')
  getResult(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.interviews.getResult(id, user.id);
  }

  @Get(':id')
  getOwned(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.interviews.getOwned(id, user.id);
  }
}
