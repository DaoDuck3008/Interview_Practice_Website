import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get('admin')
  findAllAdmin(@Query() query: QueryAuditLogDto) {
    return this.audit.findAllAdmin(query);
  }

  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.audit.findOneAdmin(id);
  }
}
