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
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { QueryDailyDto } from './dto/query-daily.dto';
import { LockUserDto } from './dto/lock-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  THROTTLE_ADMIN_MUTATION,
  THROTTLE_ADMIN_SENSITIVE,
} from '../../common/throttling/throttle-profiles';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('admin')
  findAllAdmin(@Query() query: QueryUserDto) {
    return this.usersService.findAllAdmin(query);
  }

  @Get('admin/stats')
  getStats() {
    return this.usersService.getStats();
  }

  @Get('admin/registrations-daily')
  getRegistrationsDaily(@Query() query: QueryDailyDto) {
    return this.usersService.getRegistrationsDaily(query.days);
  }

  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.usersService.getAdminDetail(id);
  }

  @Patch('admin/:id/lock')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  setLock(@Param('id') id: string, @Body() dto: LockUserDto) {
    return this.usersService.setLock(id, dto.isLock);
  }

  @Patch('admin/:id/verify')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  verify(@Param('id') id: string) {
    return this.usersService.verifyManually(id);
  }

  @Post('admin/:id/reset-password')
  @Throttle(THROTTLE_ADMIN_SENSITIVE)
  resetPassword(@Param('id') id: string) {
    return this.usersService.resetPassword(id);
  }
}
