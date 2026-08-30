import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AiCreditsService } from './ai-credits.service';

@Controller('ai-credits')
export class AiCreditsController {
  constructor(private readonly aiCredits: AiCreditsService) {}

  @Get('pricing')
  getPricing() {
    return this.aiCredits.getPricing();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(@CurrentUser() user: { id: string }) {
    return this.aiCredits.getBalance(user.id);
  }

  @Get('admin/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdminSummary() {
    return this.aiCredits.getAdminSummary();
  }
}
