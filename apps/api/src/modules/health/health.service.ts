import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { redactSensitiveLogData } from '../../common/utils/log-redaction.util';
import { withTimeout } from '../../common/utils/timeout.util';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { AI_JOBS_QUEUE } from '../ai-jobs/ai-jobs.types';

@Injectable()
export class HealthService implements OnModuleInit, BeforeApplicationShutdown {
  private readonly logger = new Logger(HealthService.name);
  private shuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(AI_JOBS_QUEUE) private readonly aiQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.requireDependencies();
  }

  beforeApplicationShutdown() {
    this.shuttingDown = true;
  }

  live() {
    return { status: 'ok' };
  }

  async ready() {
    if (this.shuttingDown) {
      throw new ServiceUnavailableException({
        message: 'Dịch vụ đang tắt để triển khai.',
        errorCode: 'SERVICE_UNAVAILABLE',
      });
    }

    try {
      await this.requireDependencies();
      return { status: 'ok' };
    } catch (error) {
      this.logger.warn(
        `Readiness thất bại: ${redactSensitiveLogData(
          error instanceof Error ? error.message : String(error),
        )}`,
      );
      throw new ServiceUnavailableException({
        message: 'Dịch vụ tạm thời chưa sẵn sàng.',
        errorCode: 'SERVICE_UNAVAILABLE',
      });
    }
  }

  private async requireDependencies() {
    const timeoutMs = this.config.getOrThrow<number>(
      'health.dependencyTimeoutMs',
    );
    await Promise.all([
      withTimeout(
        this.prisma.$queryRaw(Prisma.sql`SELECT 1`),
        timeoutMs,
        'Kiểm tra database',
      ),
      withTimeout(this.redis.ping(), timeoutMs, 'Kiểm tra Redis'),
      withTimeout(this.aiQueue.waitUntilReady(), timeoutMs, 'Kiểm tra BullMQ'),
    ]);
  }
}
