import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { ReconcileQueryDto } from './dto/reconcile-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  createCheckout(
    @CurrentUser() user: { id: string; email: string; role: Role },
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckout(user.id, dto.planSlug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  getMyOrders(@CurrentUser() user: { id: string; email: string; role: Role }) {
    return this.paymentsService.getPaidOrdersForUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  getOrder(
    @CurrentUser() user: { id: string; email: string; role: Role },
    @Param('id') id: string,
  ) {
    return this.paymentsService.getOrderForUser(user.id, id);
  }

  // ─── Admin: sổ cái giao dịch ────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/orders')
  findAllAdmin(@Query() query: QueryOrderDto) {
    return this.paymentsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/orders/stats')
  getStats() {
    return this.paymentsService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/orders/export')
  getOrdersForExport(@Query() query: QueryOrderDto) {
    return this.paymentsService.getOrdersForExport(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/reconcile/config')
  getReconcileConfig() {
    return this.paymentsService.getReconcileConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/reconcile')
  reconcile(@Query() query: ReconcileQueryDto) {
    return this.paymentsService.reconcile(query.from, query.to);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/orders/:id')
  getOrderAdmin(@Param('id') id: string) {
    return this.paymentsService.getOrderAdmin(id);
  }

  // Public — Sepay gọi tới. URL: /api/v1/payments/hooks/sepay-payment
  @Post('hooks/sepay-payment')
  sepayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: any,
    @Headers('x-sepay-signature') signature?: string,
    @Headers('x-sepay-timestamp') timestamp?: string,
  ) {
    return this.paymentsService.handleSepayWebhook(
      payload,
      req.rawBody,
      signature,
      timestamp,
    );
  }
}
