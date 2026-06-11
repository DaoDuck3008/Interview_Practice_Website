import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [TopicsService],
  controllers: [TopicsController],
})
export class TopicsModule {}
