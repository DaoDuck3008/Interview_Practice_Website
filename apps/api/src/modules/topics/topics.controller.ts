import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryAdminTopicDto } from './dto/query-admin-topic.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { Role } from '@prisma/client';
import {
  THROTTLE_ADMIN_MUTATION,
  THROTTLE_HEAVY_UPLOAD,
} from '../../common/throttling/throttle-profiles';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

@Controller('topics')
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  @Get()
  findAll() {
    return this.topicsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all')
  findAllAdmin(@Query() query: QueryAdminTopicDto) {
    return this.topicsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @Throttle(THROTTLE_ADMIN_MUTATION)
  create(@Body() dto: CreateTopicDto) {
    return this.topicsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.topicsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/icon')
  @Throttle(THROTTLE_HEAVY_UPLOAD)
  @UseInterceptors(
    FileInterceptor(
      'file',
      fileUploadOptions({
        mimeList: ALLOWED_MIME,
        maxSize: MAX_SIZE,
        errorMessage:
          'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG, WebP, SVG.',
      }),
    ),
  )
  uploadIcon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không có file được gửi lên.');
    return this.topicsService.uploadIcon(id, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }
}
