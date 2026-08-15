import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AuditAction, Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { fileUploadOptions } from '../../../common/upload/file-upload.options';
import {
  THROTTLE_AI_ACTION,
  THROTTLE_ADMIN_MUTATION,
  THROTTLE_HEAVY_UPLOAD,
} from '../../../common/throttling/throttle-profiles';
import { Audit } from '../../audit/audit.decorator';
import { MAX_CV_BYTES } from './mock-cv.constants';
import { MockCvAnalysisService } from './mock-cv-analysis.service';
import { CreateMockCvDto } from './dto/create-mock-cv.dto';
import { QueryMockCvDto } from './dto/query-mock-cv.dto';
import { QueryAdminMockCvDto } from './dto/query-admin-mock-cv.dto';
import { MockCvAdminService } from './mock-cv-admin.service';

interface AuthUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('mock-cvs')
export class MockCvAnalysisController {
  constructor(
    private readonly mockCvs: MockCvAnalysisService,
    private readonly admin: MockCvAdminService,
  ) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAllAdmin(@Query() query: QueryAdminMockCvDto) {
    return this.admin.findAll(query);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAdminStats() {
    return this.admin.getStats();
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_CV_ADMIN_VIEW_DETAIL,
    entityType: 'MockCv',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
    omitResponse: true,
  })
  getAdminDetail(@Param('id') id: string) {
    return this.admin.getDetail(id);
  }

  @Post('admin/:id/retry-analysis')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_CV_ADMIN_RETRY_ANALYSIS,
    entityType: 'MockCv',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
    omitResponse: true,
  })
  retryAnalysisAdmin(@Param('id') id: string) {
    return this.admin.retryAnalysis(id);
  }

  @Post('admin/:id/retry-questions')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_CV_ADMIN_RETRY_QUESTIONS,
    entityType: 'MockCv',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
    omitResponse: true,
  })
  retryQuestionsAdmin(@Param('id') id: string) {
    return this.admin.retryQuestions(id);
  }

  @Post('admin/interviews/:id/retry-scoring')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_CV_INTERVIEW_ADMIN_RETRY_SCORING,
    entityType: 'MockCvInterview',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
    omitResponse: true,
  })
  retryInterviewScoringAdmin(@Param('id') id: string) {
    return this.admin.retryInterviewScoring(id);
  }

  @Delete('admin/interviews/:id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_CV_INTERVIEW_ADMIN_HARD_DELETE,
    entityType: 'MockCvInterview',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
  })
  hardDeleteInterviewAdmin(@Param('id') id: string) {
    return this.admin.hardDeleteInterview(id);
  }

  @Delete('admin/:id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.MOCK_CV_ADMIN_HARD_DELETE,
    entityType: 'MockCv',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
  })
  hardDeleteAdmin(@Param('id') id: string) {
    return this.admin.hardDelete(id);
  }

  @Post()
  @Throttle(THROTTLE_HEAVY_UPLOAD)
  @UseInterceptors(
    FileInterceptor(
      'cv',
      fileUploadOptions({
        mimeList: ['application/pdf'],
        maxSize: MAX_CV_BYTES,
        errorMessage: 'CV phải là file PDF.',
      }),
    ),
  )
  create(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMockCvDto,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file CV dạng PDF.');
    return this.mockCvs.create(user.id, dto, file);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryMockCvDto) {
    return this.mockCvs.findAll(user.id, query);
  }

  @Post(':id/retry-analysis')
  @Throttle(THROTTLE_AI_ACTION)
  retryAnalysis(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockCvs.retryAnalysis(id, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockCvs.remove(id, user.id);
  }

  @Get(':id')
  getOwned(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mockCvs.getOwned(id, user.id);
  }
}
