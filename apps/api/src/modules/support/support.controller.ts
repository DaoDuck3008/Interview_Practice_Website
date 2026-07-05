import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
}

/** Gửi tin nhắn đi qua WebSocket (`support:send`) — các route ở đây chỉ để tải lịch sử. */
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private support: SupportService) {}

  @Get('me')
  getMyThread(@CurrentUser() user: AuthUser) {
    return this.support.getThread(user.id);
  }

  @Get('threads')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getThreads() {
    return this.support.getThreads();
  }

  @Get('threads/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getThread(@Param('userId') userId: string) {
    return this.support.getThread(userId);
  }
}
