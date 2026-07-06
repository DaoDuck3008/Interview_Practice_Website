import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [PlansService],
  controllers: [PlansController],
})
export class PlansModule {}
