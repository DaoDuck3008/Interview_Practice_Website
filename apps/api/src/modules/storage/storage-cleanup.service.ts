import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, StorageCleanupBucket } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';

const CLEANUP_BATCH_SIZE = 50;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  scheduleInTransaction(
    tx: Prisma.TransactionClient,
    items: Array<{ bucket: StorageCleanupBucket; objectKey: string }>,
  ) {
    const uniqueItems = [
      ...new Map(
        items.map((item) => [`${item.bucket}:${item.objectKey}`, item]),
      ).values(),
    ];
    if (uniqueItems.length === 0) return Promise.resolve();

    return tx.storageCleanupJob.createMany({
      data: uniqueItems,
      skipDuplicates: true,
    });
  }

  @Cron('* * * * *')
  async processDue() {
    if (this.processing) return;
    this.processing = true;
    try {
      const jobs = await this.prisma.storageCleanupJob.findMany({
        where: { nextAttemptAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: CLEANUP_BATCH_SIZE,
      });
      await Promise.all(jobs.map((job) => this.process(job)));
    } finally {
      this.processing = false;
    }
  }

  async processDueBestEffort() {
    try {
      await this.processDue();
    } catch (error) {
      this.logger.error(
        'Không thể chạy lượt dọn object R2 ngay sau khi xóa dữ liệu.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async process(job: {
    id: string;
    bucket: StorageCleanupBucket;
    objectKey: string;
    attempts: number;
  }) {
    try {
      if (job.bucket === StorageCleanupBucket.PRIVATE) {
        await this.storage.deletePrivateOrThrow(job.objectKey);
      } else {
        await this.storage.deleteOrThrow(job.objectKey);
      }
      await this.prisma.storageCleanupJob.deleteMany({
        where: { id: job.id },
      });
    } catch (error) {
      const attempts = job.attempts + 1;
      const delayMs = Math.min(
        MAX_RETRY_DELAY_MS,
        60_000 * 2 ** Math.min(attempts - 1, 6),
      );
      await this.prisma.storageCleanupJob.updateMany({
        where: { id: job.id },
        data: {
          attempts,
          nextAttemptAt: new Date(Date.now() + delayMs),
          lastError:
            error instanceof Error
              ? error.message.slice(0, 1_000)
              : String(error).slice(0, 1_000),
        },
      });
      this.logger.warn(
        `Chưa thể xóa object R2 ${job.bucket}/${job.objectKey}; sẽ thử lại.`,
      );
    }
  }
}
