import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuditAction, Role } from '@prisma/client';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryMonthlyDto } from './dto/query-monthly.dto';
import { FlagScoreDto } from './dto/flag-score.dto';
import { QueryAdminSessionDto } from './dto/query-admin-session.dto';
import { QueryActiveUsersDto } from './dto/query-active-users.dto';
import { ReviewScoreDto } from './dto/review-score.dto';
import { ManualScoreDto } from './dto/manual-score.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { QuotaGuard } from '../quota/quota.guard';
import { UserActionThrottle } from '../../common/throttling/user-action-throttle.decorator';
import { UserActionThrottlerGuard } from '../../common/throttling/user-action-throttler.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { MAX_AUDIO_BYTES } from '../../common/upload/audio.constants';
import { ConcurrencyInterceptor } from '../../common/concurrency/concurrency.interceptor';
import {
  THROTTLE_ADMIN_SENSITIVE,
  THROTTLE_ADMIN_MUTATION,
  THROTTLE_AI_ACTION,
  THROTTLE_USER_AUDIO_UPLOAD,
} from '../../common/throttling/throttle-profiles';
import { Audit } from '../audit/audit.decorator';

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

  /** Thống kê toàn thời gian cho dashboard cá nhân. */
  @Get('me/stats')
  getMyStats(@CurrentUser() user: AuthUser) {
    return this.sessions.getMyStats(user.id);
  }

  /** Lịch sử luyện tập (phân trang). */
  @Get('me/history')
  getMyHistory(@CurrentUser() user: AuthUser, @Query() query: QueryHistoryDto) {
    return this.sessions.getMyHistory(user.id, query);
  }

  /** Dữ liệu biểu đồ tiến bộ trong 1 tháng. */
  @Get('me/monthly')
  getMyMonthly(@CurrentUser() user: AuthUser, @Query() query: QueryMonthlyDto) {
    return this.sessions.getMyMonthly(user.id, query.month);
  }

  /** Heatmap hoạt động 1 năm gần nhất. */
  @Get('me/heatmap')
  getMyHeatmap(@CurrentUser() user: AuthUser) {
    return this.sessions.getMyHeatmap(user.id);
  }

  @Post()
  @UserActionThrottle(THROTTLE_USER_AUDIO_UPLOAD)
  @Audit({
    action: AuditAction.SESSION_CREATE,
    entityType: 'Session',
    entityId: ({ response }) =>
      typeof response === 'object' && response !== null && 'id' in response
        ? String(response.id)
        : null,
    targetUserId: ({ request }) => request.user?.id,
  })
  @UseGuards(UserActionThrottlerGuard, QuotaGuard)
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
    if (!file)
      throw new BadRequestException('Không có file audio được gửi lên.');
    return this.sessions.create(user.id, file, dto);
  }

  @Post(':id/score')
  @Throttle(THROTTLE_AI_ACTION)
  @UseInterceptors(ConcurrencyInterceptor)
  score(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.enqueueScore(id, user.id);
  }

  /** User báo điểm chấm sai/khiếu nại cho session đã chấm. */
  @Post(':id/score/flag')
  @Throttle(THROTTLE_AI_ACTION)
  @Audit({
    action: AuditAction.SCORE_FLAG,
    entityType: 'Score',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ request }) => request.user?.id,
  })
  flagScore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: FlagScoreDto,
  ) {
    return this.sessions.flagScore(id, user.id, dto.reason);
  }

  @Post(':id/improve')
  @Throttle(THROTTLE_AI_ACTION)
  @UseInterceptors(ConcurrencyInterceptor)
  improve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.enqueueImprove(id, user.id);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAllAdmin(@Query() query: QueryAdminSessionDto) {
    return this.sessions.findAllAdmin(query);
  }

  @Get('admin/active-users')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getActiveUsersStats() {
    return this.sessions.getActiveUsersStats();
  }

  @Get('admin/active-users-daily')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getActiveUsersDaily(@Query() query: QueryActiveUsersDto) {
    return this.sessions.getActiveUsersDaily(query.days);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.SESSION_ADMIN_VIEW_DETAIL,
    entityType: 'Session',
    entityId: ({ request }) => String(request.params.id),
    targetUserId: ({ response }) =>
      typeof response === 'object' && response !== null && 'userId' in response
        ? String(response.userId)
        : null,
  })
  getAdminDetail(@Param('id') id: string) {
    return this.sessions.getAdminDetail(id);
  }

  @Patch('admin/:id/review')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.SCORE_REVIEW,
    entityType: 'Score',
    entityId: ({ request }) => String(request.params.id),
  })
  reviewFlag(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewScoreDto,
  ) {
    return this.sessions.reviewFlag(id, dto, admin.id);
  }

  @Patch('admin/:id/score')
  @Throttle(THROTTLE_ADMIN_SENSITIVE)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Audit({
    action: AuditAction.SCORE_MANUAL_RESCORE,
    entityType: 'Score',
    entityId: ({ request }) => String(request.params.id),
  })
  manualRescore(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ManualScoreDto,
  ) {
    return this.sessions.manualRescore(id, dto, admin.id);
  }

  /**
   * Fallback cho frontend khi mất kết nối WebSocket lúc job score/improve xử lý
   * xong — phải khai báo SAU CÙNG: NestJS/Express khớp route theo thứ tự khai
   * báo, đặt `:id` trước sẽ "nuốt" mất các route literal phía trên (vd `admin`
   * bị hiểu nhầm thành `id = 'admin'`).
   */
  @Get(':id')
  getOwned(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.getOwned(id, user.id);
  }
}
