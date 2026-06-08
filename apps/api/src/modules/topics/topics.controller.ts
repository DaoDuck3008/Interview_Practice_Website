import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('topics')
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  @Get()
  findAll() {
    return this.topicsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTopicDto) {
    return this.topicsService.create(dto);
  }
}
