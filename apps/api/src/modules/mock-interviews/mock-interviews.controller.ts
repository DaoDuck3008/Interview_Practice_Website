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
import { AuditAction, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConcurrencyInterceptor } from '../../common/concurrency/concurrency.interceptor';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { MAX_AUDIO_BYTES } from '../../common/upload/audio.constants';
import {
  THROTTLE_AI_ACTION,
  THROTTLE_ADMIN_MUTATION,
  THROTTLE_HEAVY_UPLOAD,
} from '../../common/throttling/throttle-profiles';
import { Audit } from '../audit/audit.decorator';
import { MockInterviewsService } from './mock-interviews.service';
import { CreateMockInterviewDto } from './dto/create-mock-interview.dto';
import { QueryMockInterviewDto } from './dto/query-mock-interview.dto';
import { AnswerMockQuestionDto } from './dto/answer-mock-question.dto';
import { QueryAdminMockInterviewDto } from './dto/query-admin-mock-interview.dto';

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

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAllAdmin(@Query() query: QueryAdminMockInterviewDto) {
    return this.mockInterviews.findAllAdmin(query);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAdminStats() {
    return this.mockInterviews.getAdminStats();
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_INTERVIEW_ADMIN_VIEW_DETAIL,
    entityType: 'MockInterview',
    omitResponse: true,
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
  })
  getAdminDetail(@Param('id') id: string) {
    return this.mockInterviews.getAdminDetail(id);
  }

  @Post('admin/:id/retry-scoring')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_INTERVIEW_ADMIN_RETRY_SCORING,
    entityType: 'MockInterview',
    omitResponse: true,
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
  })
  retryScoringAdmin(@Param('id') id: string) {
    return this.mockInterviews.retryScoringAdmin(id);
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

  @Post(':id/retry-scoring')
  @Throttle(THROTTLE_AI_ACTION)
  @UseInterceptors(ConcurrencyInterceptor)
  retryScoring(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockInterviews.retryScoring(id, user.id);
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
