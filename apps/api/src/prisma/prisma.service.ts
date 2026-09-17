import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { redactSensitiveLogData } from '../common/utils/log-redaction.util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Prisma 7 không còn Rust engine — PrismaClient cần một driver adapter.
    // DATABASE_URL được nạp vào process.env bởi ConfigModule (xem app.module.ts).
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error(
        `Database connection failed: ${redactSensitiveLogData(
          error instanceof Error ? error.message : String(error),
        )}`,
      );
      throw new Error('Database không sẵn sàng khi khởi động');
    }
  }
}
