import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Hạ cấp subscription đã hết hạn: ACTIVE + expiresAt < now → EXPIRED (chạy mỗi giờ).
   * Việc gate quyền truy cập vẫn dựa vào expiresAt nên không phụ thuộc cron này,
   * nhưng cron giúp trạng thái persisted đúng cho quota/báo cáo sau này.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async downgradeExpiredSubscriptions() {
    const { count } = await this.prisma.subscription.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    if (count > 0) {
      this.logger.log(`Đã hạ cấp ${count} subscription hết hạn.`);
    }
  }

  /** Subscription hiện tại của user (1–1). Trả null nếu chưa từng mua. */
  async getMine(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: { select: { slug: true, name: true, durationDays: true } },
      },
    });
    if (!sub) return null;

    // "Còn hiệu lực" = chưa hết hạn và chưa huỷ (cron hạ cấp chưa làm nên dựa vào expiresAt).
    const isActive = sub.status !== 'CANCELED' && sub.expiresAt > new Date();

    return {
      status: sub.status,
      isActive,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      plan: sub.plan,
    };
  }
}
