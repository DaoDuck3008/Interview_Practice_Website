import { Controller, Get, UseGuards } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('quota')
export class QuotaController {
  constructor(private readonly quota: QuotaService) {}

  /** Trạng thái hạn mức của user hiện tại (cho frontend hiển thị "còn N lượt"). */
  @Get('me')
  getMine(@CurrentUser() user: { id: string }) {
    return this.quota.getStatus(user.id);
  }
}
