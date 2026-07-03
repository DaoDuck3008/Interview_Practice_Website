import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

/**
 * Hạ tầng kết nối BullMQ — dùng chung giá trị config `redis.url` với
 * REDIS_CLIENT nhưng KHÔNG tái dùng chính client đó: Worker của BullMQ bắt
 * buộc `maxRetriesPerRequest: null` (dùng lệnh blocking nội bộ), trong khi
 * REDIS_CLIENT đang cấu hình `maxRetriesPerRequest: 3` cho refresh-token
 * allowlist — dùng chung sẽ lỗi ngay lúc khởi động.
 *
 * Truyền object host/port (không phải 1 instance ioredis dựng sẵn) vì bullmq
 * bundle riêng 1 bản ioredis khác — đưa thẳng instance từ ioredis ở
 * package.json gốc bị lệch type (2 bản class Redis khác nhau). Để bullmq tự
 * dựng client bằng bản ioredis nội bộ của nó.
 *
 * Không @Global() (khác RedisModule): module nào cần queue tự
 * BullModule.registerQueue(...), forRootAsync chỉ cấp connection mặc định.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.getOrThrow<string>('redis.url'));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
            username: url.username || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
    }),
  ],
})
export class BullMqModule {}
