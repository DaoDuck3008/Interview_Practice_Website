import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';

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

  /** Danh sách subscription cho admin: lọc theo trạng thái, khoảng startedAt, tìm theo tên/email. */
  async findAllAdmin(query: QuerySubscriptionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;

    // Khoảng startedAt: "from" lấy từ 00:00 ngày đó, "to" tới hết 23:59:59.999 ngày đó (UTC).
    const startedAt =
      query.startedFrom || query.startedTo
        ? {
            ...(query.startedFrom && { gte: new Date(query.startedFrom) }),
            ...(query.startedTo && {
              lte: new Date(`${query.startedTo.slice(0, 10)}T23:59:59.999Z`),
            }),
          }
        : undefined;

    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status && { status: query.status }),
      ...(startedAt && { startedAt }),
      ...(query.search && {
        user: {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { name: true, slug: true, durationDays: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** Lịch sử đơn của một subscription (admin) — mới nhất trước, mọi trạng thái. */
  async getOrders(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Không tìm thấy gói đăng ký');

    return this.prisma.order.findMany({
      where: { subscriptionId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amountVnd: true,
        status: true,
        provider: true,
        transferCode: true,
        paidAt: true,
        periodEnd: true,
        createdAt: true,
      },
    });
  }

  /** Hủy subscription thủ công (admin): status → CANCELED, ghi canceledAt. */
  async cancel(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Không tìm thấy gói đăng ký');

    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, slug: true, durationDays: true } },
      },
    });
  }

  /** Kích hoạt lại subscription đã hủy (admin): status → ACTIVE, xóa canceledAt. Giữ nguyên expiresAt. */
  async activate(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Không tìm thấy gói đăng ký');

    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE', canceledAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, slug: true, durationDays: true } },
      },
    });
  }

  /**
   * Gia hạn thủ công (admin) — không qua thanh toán.
   * Cộng đúng durationDays của gói vào mốc lớn hơn giữa now và expiresAt
   * (đang còn hạn → cộng dồn; đã hết hạn → tính từ bây giờ), đưa status về ACTIVE.
   */
  async renewManual(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: { select: { durationDays: true } } },
    });
    if (!sub) throw new NotFoundException('Không tìm thấy gói đăng ký');

    const now = new Date();
    const base = sub.expiresAt > now ? sub.expiresAt : now;
    const expiresAt = new Date(
      base.getTime() + sub.plan.durationDays * 24 * 60 * 60 * 1000,
    );

    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE', expiresAt, canceledAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, slug: true, durationDays: true } },
      },
    });
  }
}
