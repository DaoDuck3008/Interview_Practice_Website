import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { THROTTLE_AI_ACTION } from '../../../common/throttling/throttle-profiles';
import { StartMockCvInterviewDto } from '../analysis/dto/start-mock-cv-interview.dto';
import { MockCvsService } from './mock-cvs.service';

interface AuthUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('mock-cvs')
export class MockCvsController {
  constructor(private readonly mockCvs: MockCvsService) {}

  @Post(':id/start')
  @Throttle(THROTTLE_AI_ACTION)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: StartMockCvInterviewDto,
  ) {
    return this.mockCvs.start(id, user.id, dto);
  }
}
