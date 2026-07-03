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
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryMonthlyDto } from './dto/query-monthly.dto';
import { FlagScoreDto } from './dto/flag-score.dto';
import { QueryAdminSessionDto } from './dto/query-admin-session.dto';
import { ReviewScoreDto } from './dto/review-score.dto';
import { ManualScoreDto } from './dto/manual-score.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
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
    if (!file)
      throw new BadRequestException('Không có file audio được gửi lên.');
    return this.sessions.create(user.id, file, dto);
  }

  @Post(':id/score')
  @UseInterceptors(ConcurrencyInterceptor)
  score(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessions.enqueueScore(id, user.id);
  }

  /** User báo điểm chấm sai/khiếu nại cho session đã chấm. */
  @Post(':id/score/flag')
  flagScore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: FlagScoreDto,
  ) {
    return this.sessions.flagScore(id, user.id, dto.reason);
  }

  @Post(':id/improve')
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

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAdminDetail(@Param('id') id: string) {
    return this.sessions.getAdminDetail(id);
  }

  @Patch('admin/:id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reviewFlag(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewScoreDto,
  ) {
    return this.sessions.reviewFlag(id, dto, admin.id);
  }

  @Patch('admin/:id/score')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
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
