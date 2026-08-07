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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { fileUploadOptions } from '../../../common/upload/file-upload.options';
import {
  THROTTLE_AI_ACTION,
  THROTTLE_HEAVY_UPLOAD,
} from '../../../common/throttling/throttle-profiles';
import { MAX_CV_BYTES } from './mock-cv.constants';
import { MockCvAnalysisService } from './mock-cv-analysis.service';
import { CreateMockCvDto } from './dto/create-mock-cv.dto';
import { QueryMockCvDto } from './dto/query-mock-cv.dto';

interface AuthUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('mock-cvs')
export class MockCvAnalysisController {
  constructor(private readonly mockCvs: MockCvAnalysisService) {}

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
