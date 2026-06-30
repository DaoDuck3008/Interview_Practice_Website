import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FREE_TIER_LIMITS,
  QuotaLimits,
  vnPeriodStarts,
} from './quota.constants';

@Injectable()
export class QuotaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Hạn mức hiệu lực của user: lấy từ gói còn hiệu lực (chưa hủy & chưa hết hạn),
   * nếu không có thì dùng FREE_TIER_LIMITS.
   */
  async getLimits(userId: string): Promise<QuotaLimits> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          select: {
            isUnlimited: true,
            dailyScoreLimit: true,
            monthlyScoreLimit: true,
          },
        },
      },
    });

    const active =
      sub && sub.status !== 'CANCELED' && sub.expiresAt > new Date();
    if (!active) return FREE_TIER_LIMITS;

    return {
      isUnlimited: sub.plan.isUnlimited,
      dailyLimit: sub.plan.dailyScoreLimit,
      monthlyLimit: sub.plan.monthlyScoreLimit,
    };
  }

  /** Số lượt đã dùng trong hôm nay & tháng này (giờ VN). */
  async getUsage(userId: string): Promise<{ daily: number; monthly: number }> {
    const { startOfDay, startOfMonth } = vnPeriodStarts();
    const [daily, monthly] = await Promise.all([
      this.prisma.usageLog.count({
        where: { userId, createdAt: { gte: startOfDay } },
      }),
      this.prisma.usageLog.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
    ]);
    return { daily, monthly };
  }

  /**
   * Kiểm tra TRƯỚC khi cho luyện tập (tốn STT/DeepSeek). Vượt hạn mức → 429.
   * Không tăng đếm — record() mới tăng, gọi sau khi tạo session thành công.
   */
  async assertWithinLimit(userId: string): Promise<void> {
    const limits = await this.getLimits(userId);
    if (limits.isUnlimited) return;
    if (limits.dailyLimit === null && limits.monthlyLimit === null) return;

    const usage = await this.getUsage(userId);

    if (limits.dailyLimit !== null && usage.daily >= limits.dailyLimit) {
      throw this.limitException('hôm nay', limits.dailyLimit);
    }
    if (limits.monthlyLimit !== null && usage.monthly >= limits.monthlyLimit) {
      throw this.limitException('tháng này', limits.monthlyLimit);
    }
  }

  /** Ghi 1 lượt đã dùng — gọi SAU khi tạo session thành công. */
  record(userId: string, sessionId?: string) {
    return this.prisma.usageLog.create({
      data: { userId, sessionId },
    });
  }

  /** Trạng thái hạn mức cho frontend hiển thị (used/limit theo ngày & tháng). */
  async getStatus(userId: string) {
    const limits = await this.getLimits(userId);
    if (limits.isUnlimited) {
      return { unlimited: true, daily: null, monthly: null };
    }
    const usage = await this.getUsage(userId);
    return {
      unlimited: false,
      daily:
        limits.dailyLimit === null
          ? null
          : { used: usage.daily, limit: limits.dailyLimit },
      monthly:
        limits.monthlyLimit === null
          ? null
          : { used: usage.monthly, limit: limits.monthlyLimit },
    };
  }

  private limitException(period: string, limit: number) {
    return new HttpException(
      `Bạn đã dùng hết ${limit} lượt luyện tập ${period}. Nâng cấp gói để luyện nhiều hơn.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
