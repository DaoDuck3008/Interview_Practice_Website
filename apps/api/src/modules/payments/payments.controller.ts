import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  @Get('orders/:id')
  getOrder(
    @CurrentUser() user: { id: string; email: string; role: Role },
    @Param('id') id: string,
  ) {
    return this.paymentsService.getOrderForUser(user.id, id);
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
