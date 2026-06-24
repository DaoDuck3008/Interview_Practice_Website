import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const MAX_RECONNECT_ATTEMPTS = 10;

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');
        const url = config.getOrThrow<string>('redis.url');
        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > MAX_RECONNECT_ATTEMPTS) {
              logger.error(
                `Không thể kết nối Redis sau ${MAX_RECONNECT_ATTEMPTS} lần thử, ngừng thử lại`,
              );
              return null;
            }
            return Math.min(times * 50, 2000);
          },
        });

        client.on('connect', () => logger.log(`Đang kết nối Redis (${url})`));
        client.on('ready', () => logger.log('Kết nối Redis thành công'));
        client.on('reconnecting', (delay: number) =>
          logger.warn(`Mất kết nối Redis, đang thử lại sau ${delay}ms...`),
        );
        client.on('end', () => logger.warn('Đã đóng kết nối Redis'));
        client.on('error', (err: Error & { code?: string }) =>
          logger.error(
            `Lỗi kết nối Redis: ${err.message || err.code || err.name}`,
          ),
        );

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Đóng kết nối Redis khi app tắt để tránh rò rỉ socket
  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
