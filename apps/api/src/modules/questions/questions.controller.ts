import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuestionDto>) {
    return this.questionsService.update(id, dto);
  }
}
