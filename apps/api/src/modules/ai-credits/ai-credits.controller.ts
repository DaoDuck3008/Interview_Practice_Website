import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AiCreditsService } from './ai-credits.service';
import { AI_CREDIT_PRICING } from './ai-credit-pricing';

@UseGuards(JwtAuthGuard)
@Controller('ai-credits')
export class AiCreditsController {
  constructor(private readonly aiCredits: AiCreditsService) {}

  @Get('me')
  getMine(@CurrentUser() user: { id: string }) {
    return this.aiCredits.getBalance(user.id);
  }

  @Get('pricing')
  getPricing() {
    return AI_CREDIT_PRICING;
  }

  @Get('admin/summary')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAdminSummary() {
    return this.aiCredits.getAdminSummary();
  }
}
