import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { QueryCursorQuestionDto } from './dto/query-cursor-question.dto';
import { QueryAdminQuestionDto } from './dto/query-admin-question.dto';
import { QueryTopRecordedDto } from './dto/query-top-recorded.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { THROTTLE_ADMIN_MUTATION } from '../../common/throttling/throttle-profiles';

@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  findAll(@Query() query: QueryQuestionDto) {
    return this.questionsService.findAll(query);
  }

  @Get('random')
  findRandom(@Query() query: QueryQuestionDto) {
    return this.questionsService.findRandom(query);
  }

  @Get('order')
  findOrder(@Query() query: QueryQuestionDto) {
    return this.questionsService.findOrder(query.topicId);
  }

  @Get('cursor')
  findByCursor(@Query() query: QueryCursorQuestionDto) {
    return this.questionsService.findByCursor(query);
  }

  @Get('detail/:id')
  findOnePublic(@Param('id') id: string) {
    return this.questionsService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all')
  findAllAdmin(@Query() query: QueryAdminQuestionDto) {
    return this.questionsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('topic-counts')
  countByTopic() {
    return this.questionsService.countByTopic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('top-recorded')
  getTopRecorded(@Query() query: QueryTopRecordedDto) {
    return this.questionsService.getTopRecorded(query.limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @Throttle(THROTTLE_ADMIN_MUTATION)
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  remove(@Param('id') id: string) {
    return this.questionsService.softDelete(id);
  }
}
