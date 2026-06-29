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
import { SubscriptionsService } from './subscriptions.service';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMine(@CurrentUser() user: { id: string; email: string; role: Role }) {
    return this.subscriptionsService.getMine(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all')
  findAllAdmin(@Query() query: QuerySubscriptionDto) {
    return this.subscriptionsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id/orders')
  getOrders(@Param('id') id: string) {
    return this.subscriptionsService.getOrders(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancel(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.subscriptionsService.activate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('grant')
  grant(
    @CurrentUser() user: { id: string; email: string; role: Role },
    @Body() dto: GrantSubscriptionDto,
  ) {
    return this.subscriptionsService.grantManual(dto, user.id);
  }
}
