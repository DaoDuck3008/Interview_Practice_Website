import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExplanationCreditsService } from './explanation-credits.service';

@Controller('explanation-credits')
export class ExplanationCreditsController {
  constructor(private readonly credits: ExplanationCreditsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(@CurrentUser() user: { id: string }) {
    return this.credits.getBalance(user.id);
  }
}
