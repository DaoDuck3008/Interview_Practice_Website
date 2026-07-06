import { Module } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { QuotaController } from './quota.controller';
import { QuotaGuard } from './quota.guard';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [QuotaService, QuotaGuard],
  controllers: [QuotaController],
  exports: [QuotaService, QuotaGuard],
})
export class QuotaModule {}
