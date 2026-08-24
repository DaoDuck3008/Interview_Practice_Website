import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import { UserActionThrottlerGuard } from './user-action-throttler.guard';

// Để global để cấu hình HTTP throttler và WebSocket gateway cùng dùng lại
// Redis-backed storage mà không phải import module này ở nhiều nơi.
@Global()
@Module({
  imports: [RedisModule],
  providers: [RedisThrottlerStorage, UserActionThrottlerGuard],
  exports: [RedisThrottlerStorage, UserActionThrottlerGuard],
})
export class ThrottlingModule {}
