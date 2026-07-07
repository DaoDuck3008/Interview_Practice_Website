import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { fileUploadOptions } from '../../common/upload/file-upload.options';

import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
} from '../../common/upload/image.constants';
import { THROTTLE_HEAVY_UPLOAD } from '../../common/throttling/throttle-profiles';

interface AuthUser {
  id: string;
}

/** Gửi tin nhắn đi qua WebSocket (`support:send`) — các route ở đây để tải lịch sử & upload ảnh. */
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private support: SupportService) {}

  @Get('me')
  getMyThread(@CurrentUser() user: AuthUser) {
    return this.support.getThread(user.id);
  }

  /** Upload ảnh đính kèm; FE lấy URL rồi gửi kèm qua WebSocket `support:send`. */
  @Post('upload')
  @Throttle(THROTTLE_HEAVY_UPLOAD)
  @UseInterceptors(
    FileInterceptor(
      'file',
      fileUploadOptions({
        mimeList: ALLOWED_IMAGE_MIME,
        maxSize: MAX_IMAGE_BYTES,
        errorMessage:
          'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG, WebP, GIF.',
      }),
    ),
  )
  uploadImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không có ảnh được gửi lên.');
    return this.support.uploadImage(user.id, file);
  }

  @Get('threads')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getThreads() {
    return this.support.getThreads();
  }

  @Get('threads/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getThread(@Param('userId') userId: string) {
    return this.support.getThread(userId);
  }
}
