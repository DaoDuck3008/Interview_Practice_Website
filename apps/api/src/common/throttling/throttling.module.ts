import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { RedisThrottlerStorage } from './redis-throttler.storage';

// Để global để cấu hình HTTP throttler và WebSocket gateway cùng dùng lại
// Redis-backed storage mà không phải import module này ở nhiều nơi.
@Global()
@Module({
  imports: [RedisModule],
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottlingModule {}
