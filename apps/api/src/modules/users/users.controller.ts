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
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { LockUserDto } from './dto/lock-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('admin')
  findAllAdmin(@Query() query: QueryUserDto) {
    return this.usersService.findAllAdmin(query);
  }

  @Patch('admin/:id/lock')
  setLock(@Param('id') id: string, @Body() dto: LockUserDto) {
    return this.usersService.setLock(id, dto.isLock);
  }

  @Patch('admin/:id/verify')
  verify(@Param('id') id: string) {
    return this.usersService.verifyManually(id);
  }

  @Post('admin/:id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.usersService.resetPassword(id);
  }
}
