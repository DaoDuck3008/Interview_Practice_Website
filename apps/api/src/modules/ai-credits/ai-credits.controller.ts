import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiCreditsService } from './ai-credits.service';

@UseGuards(JwtAuthGuard)
@Controller('ai-credits')
export class AiCreditsController {
  constructor(private readonly aiCredits: AiCreditsService) {}

  @Get('me')
  getMine(@CurrentUser() user: { id: string }) {
    return this.aiCredits.getBalance(user.id);
  }
}
