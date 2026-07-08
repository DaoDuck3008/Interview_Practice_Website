import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuditAction } from '@prisma/client';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { THROTTLE_ADMIN_MUTATION } from '../../common/throttling/throttle-profiles';
import { Audit } from '../audit/audit.decorator';

@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  findActive() {
    return this.plansService.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all')
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @Audit({
    action: AuditAction.PLAN_CREATE,
    entityType: 'Plan',
    entityId: ({ response }) =>
      typeof response === 'object' && response !== null && 'id' in response
        ? String(response.id)
        : null,
  })
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @Audit({
    action: AuditAction.PLAN_UPDATE,
    entityType: 'Plan',
    entityId: ({ request }) => String(request.params.id),
  })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @Throttle(THROTTLE_ADMIN_MUTATION)
  @Audit({
    action: AuditAction.PLAN_DELETE,
    entityType: 'Plan',
    entityId: ({ request }) => String(request.params.id),
  })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
