import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { ConcurrencyInterceptor } from '../../common/concurrency/concurrency.interceptor';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserActionThrottle } from '../../common/throttling/user-action-throttle.decorator';
import { UserActionThrottlerGuard } from '../../common/throttling/user-action-throttler.guard';
import {
  THROTTLE_AI_ACTION,
  THROTTLE_USER_EXPLANATION,
} from '../../common/throttling/throttle-profiles';
import { CreateExplanationDto } from './dto/create-explanation.dto';
import { UpdateTechnicalTermDto } from './dto/update-technical-term.dto';
import { ExplanationsService } from './explanations.service';

@Controller('explanations')
export class ExplanationsController {
  constructor(private readonly explanations: ExplanationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, UserActionThrottlerGuard)
  @Throttle(THROTTLE_AI_ACTION)
  @UserActionThrottle(THROTTLE_USER_EXPLANATION)
  @UseInterceptors(ConcurrencyInterceptor)
  @HttpCode(HttpStatus.ACCEPTED)
  explain(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateExplanationDto,
  ) {
    return this.explanations.explain(user.id, dto);
  }

  @Get('terms/:id')
  @UseGuards(JwtAuthGuard)
  getStatus(@Param('id') id: string) {
    return this.explanations.getStatus(id);
  }

  @Get('admin/terms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list(@Query('search') search?: string) {
    return this.explanations.listAdmin(search);
  }

  @Patch('admin/terms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle(THROTTLE_AI_ACTION)
  update(@Param('id') id: string, @Body() dto: UpdateTechnicalTermDto) {
    return this.explanations.updateAdmin(id, dto);
  }
}
