import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { StorageModule } from '../storage/storage.module';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [StorageModule, CacheModule],
  providers: [TopicsService],
  controllers: [TopicsController],
})
export class TopicsModule {}
