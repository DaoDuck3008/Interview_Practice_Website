import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, UsageStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { FREE_TIER_LIMITS, QuotaLimits } from './quota.constants';
import { vnStartOfDay, vnStartOfWeek } from '../../common/utils/vn-time.util';
import { lockBillingUser } from '../../common/utils/billing-lock.util';

const STATUS_TTL = 15;
const RESERVATION_TTL_MS = 10 * 60 * 1000; // thời gian giữ chỗ 10 phút, đủ để gọi Whisper và tạo Session

type PrismaClientLike = PrismaService | Prisma.TransactionClient;
export type QuotaReservation = { id: string; userId: string };

@Injectable()
export class QuotaService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // ─── Public read API ───────────────────────────────────────────────

  // Lấy status từ cache hoặc tính trong Redis lại nếu chưa có
  async getStatus(userId: string) {
    return this.cache.getOrSet(this.statusCacheKey(userId), STATUS_TTL, () =>
      this.computeStatus(userId),
    );
  }

  async getLimits(userId: string): Promise<QuotaLimits> {
    return this.getLimitsWithClient(this.prisma, userId);
  }

  async getUsage(userId: string): Promise<{ daily: number; weekly: number }> {
    return this.getUsageWithClient(this.prisma, userId);
  }

  // kiểm tra xem user còn đủ quota không?
  // Dùng trong QuotaGuard
  async assertWithinLimitFor(
    userId: string,
    requestedUses: number,
  ): Promise<void> {
    const limits = await this.getLimits(userId);
    const usage = await this.getUsage(userId);
    this.assertUsageWithinLimits(limits, usage, requestedUses);
  }

  // ─── Public reservation API ────────────────────────────────────────

  /**
   * Giữ chỗ một lượt trước khi gọi Whisper. Advisory lock chỉ khóa các request của cùng user,
   * nên thao tác đếm + tạo PENDING không bị request song song chen vào.
   */
  async reserve(userId: string): Promise<QuotaReservation> {
    const reservation = await this.prisma.$transaction(async (tx) => {
      // khóa user để tránh race condition khi nhiều request song song cùng user, tránh vượt quota
      await lockBillingUser(tx, userId);

      // lấy limits và usage trong transaction để đảm bảo tính nhất quán
      // kiểm tra 1 lần nữa nhằm chắc chắn còn quota
      const limits = await this.getLimitsWithClient(tx, userId);
      if (!limits.isUnlimited) {
        const usage = await this.getUsageWithClient(tx, userId);
        this.assertUsageWithinLimits(limits, usage, 1);
      }

      return tx.usageLog.create({
        data: {
          userId,
          status: UsageStatus.PENDING,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        },
        select: { id: true, userId: true },
      });
    });

    // invalidate cache trong Redis để lần sau gọi getStatus sẽ tính lại usage
    await this.invalidateStatus(userId);
    return reservation;
  }

  /** Hoàn tất reservation cùng transaction tạo Session để không có Session không bị tính quota. */
  async consumeInTransaction(
    tx: Prisma.TransactionClient,
    reservationId: string,
    sessionId?: string,
  ): Promise<void> {
    const claimed = await tx.usageLog.updateMany({
      where: {
        id: reservationId,
        status: UsageStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: UsageStatus.CONSUMED,
        expiresAt: null,
        sessionId,
      },
    });
    if (claimed.count === 0) {
      throw new HttpException(
        'Lượt sử dụng đã hết hạn, vui lòng thử lại.',
        HttpStatus.CONFLICT,
      );
    }
  }

  async consume(reservation: QuotaReservation): Promise<void> {
    await this.prisma.$transaction((tx) =>
      this.consumeInTransaction(tx, reservation.id),
    );
    await this.invalidateStatus(reservation.userId);
  }

  /** Trả lại quota khi quá trình sử dụng reservation thất bại. */
  async cancel(reservation: QuotaReservation): Promise<void> {
    await this.prisma.usageLog.updateMany({
      where: { id: reservation.id, status: UsageStatus.PENDING },
      data: { status: UsageStatus.CANCELED, expiresAt: null },
    });
    await this.invalidateStatus(reservation.userId);
  }

  // Xóa cache status trong Redis để lần sau gọi getStatus sẽ tính lại usage
  async invalidateStatus(userId: string): Promise<void> {
    await this.cache.del(this.statusCacheKey(userId));
  }

  // ─── Private query and rule helpers ─────────────────────────────────

  private statusCacheKey(userId: string) {
    return `quota:status:${userId}`;
  }

  // Tính toán status dựa trên limits và usage, không dùng cache
  // Dùng trong getStatus() để tính lại khi cache hết hạn hoặc bị invalidate
  private async computeStatus(userId: string) {
    const limits = await this.getLimits(userId);
    const usage = await this.getUsage(userId);

    if (limits.isUnlimited) {
      return {
        unlimited: true,
        daily: null,
        weekly: null,
        todayCount: usage.daily,
      };
    }
    return {
      unlimited: false,
      daily:
        limits.dailyLimit === null
          ? null
          : { used: usage.daily, limit: limits.dailyLimit },
      weekly:
        limits.weeklyLimit === null
          ? null
          : { used: usage.weekly, limit: limits.weeklyLimit },
      todayCount: usage.daily,
    };
  }

  private async getLimitsWithClient(
    client: PrismaClientLike,
    userId: string,
  ): Promise<QuotaLimits> {
    const sub = await client.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          select: {
            isUnlimited: true,
            dailyScoreLimit: true,
            weeklyScoreLimit: true,
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
      weeklyLimit: sub.plan.weeklyScoreLimit,
    };
  }

  // Lấy usage hiện tại trong transaction để đảm bảo tính nhất quán với reserve()
  private async getUsageWithClient(
    client: PrismaClientLike,
    userId: string,
  ): Promise<{ daily: number; weekly: number }> {
    const now = new Date();
    const activeReservation = {
      OR: [
        { status: UsageStatus.CONSUMED },
        { status: UsageStatus.PENDING, expiresAt: { gt: now } },
      ],
    };
    const [daily, weekly] = await Promise.all([
      client.usageLog.count({
        where: {
          userId,
          createdAt: { gte: vnStartOfDay() },
          ...activeReservation,
        },
      }),
      client.usageLog.count({
        where: {
          userId,
          createdAt: { gte: vnStartOfWeek() },
          ...activeReservation,
        },
      }),
    ]);
    return { daily, weekly };
  }

  //  Kiểm tra usage hiện tại có vượt quá limits không, nếu vượt thì throw exception
  //  Dùng trong reserve() và assertWithinLimitFor() để kiểm tra quota trước khi tạo reservation
  private assertUsageWithinLimits(
    limits: QuotaLimits,
    usage: { daily: number; weekly: number },
    requestedUses: number,
  ) {
    if (limits.isUnlimited) return;
    if (limits.dailyLimit === null && limits.weeklyLimit === null) return;

    if (
      limits.dailyLimit !== null &&
      usage.daily + requestedUses > limits.dailyLimit
    ) {
      throw this.limitException('hôm nay', limits.dailyLimit);
    }
    if (
      limits.weeklyLimit !== null &&
      usage.weekly + requestedUses > limits.weeklyLimit
    ) {
      throw this.limitException('tuần này', limits.weeklyLimit);
    }
  }

  private limitException(period: string, limit: number) {
    return new HttpException(
      `Bạn đã dùng hết ${limit} lượt luyện tập ${period}.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
