import { Module } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { QuotaController } from './quota.controller';
import { QuotaGuard } from './quota.guard';

@Module({
  providers: [QuotaService, QuotaGuard],
  controllers: [QuotaController],
  exports: [QuotaService, QuotaGuard],
})
export class QuotaModule {}
