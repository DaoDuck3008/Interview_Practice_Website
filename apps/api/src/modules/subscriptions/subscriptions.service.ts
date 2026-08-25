import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditAction,
  AuditActorType,
  CreditCycleSource,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto';
import { AuditService } from '../audit/audit.service';
import { lockBillingUser } from '../../common/utils/billing-lock.util';
import { AiCreditsService } from '../ai-credits/ai-credits.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATS_TTL = 60; // 1 phút — thẻ thống kê admin, chấp nhận trễ vài chục giây

// Nhắc gia hạn khi gói còn <= 2 ngày.
const RENEWAL_REMINDER_WINDOW_DAYS = 2;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private cache: CacheService,
    private audit: AuditService,
    private aiCredits: AiCreditsService,
  ) {}

  /**
   * Nhắc gia hạn qua email cho các gói ACTIVE sắp hết hạn (còn <= 2 ngày), chạy mỗi ngày.
   * Chống gửi lặp bằng cột `renewalReminderSentAt` (đánh dấu đã nhắc cho chu kỳ hiện tại).
   * Mỗi email gửi best-effort — lỗi 1 người không chặn những người còn lại.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Asia/Ho_Chi_Minh' })
  async sendRenewalReminders() {
    const now = new Date();
    const threshold = new Date(
      now.getTime() + RENEWAL_REMINDER_WINDOW_DAYS * DAY_MS,
    );

    const subs = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        canceledAt: null,
        expiresAt: { gt: now, lte: threshold },
        renewalReminderSentAt: null,
      },
      include: {
        user: { select: { email: true, name: true } },
        plan: { select: { name: true } },
      },
    });

    if (subs.length === 0) return;

    const renewUrl = `${this.frontendUrl()}/pricing`;
    let sent = 0;
    for (const sub of subs) {
      try {
        const daysLeft = Math.ceil(
          (sub.expiresAt.getTime() - now.getTime()) / DAY_MS,
        );
        await this.mail.sendRenewalReminder(sub.user.email, {
          name: sub.user.name,
          planName: sub.plan.name,
          expiresAt: sub.expiresAt,
          daysLeft,
          renewUrl,
        });
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { renewalReminderSentAt: now },
        });
        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Không gửi được email nhắc gia hạn cho sub ${sub.id}: ${msg}`,
        );
      }
    }
    if (sent > 0) {
      this.logger.log(`Đã gửi ${sent}/${subs.length} email nhắc gia hạn.`);
    }
  }

  /** URL frontend từ config (không hardcode); có mặc định phòng khi thiếu env. */
  private frontendUrl(): string {
    return (
      this.config.get<string>('frontendUrl')?.replace(/\/$/, '') ??
      'http://localhost:3000'
    );
  }

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
      await this.audit.log({
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.SUBSCRIPTION_EXPIRE_CRON,
        entityType: 'Subscription',
        metadata: { count },
      });
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

    // Hủy chỉ chặn chu kỳ kế tiếp; quyền lợi hiện tại vẫn giữ đến expiresAt.
    const isActive = sub.expiresAt > new Date();

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

  /** Thẻ thống kê: đếm theo trạng thái + đếm theo từng gói. */
  async getStats() {
    return this.cache.getOrSet('stats:subscriptions', STATS_TTL, async () => {
      const [byStatus, byPlan] = await Promise.all([
        this.prisma.subscription.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        this.prisma.subscription.groupBy({
          by: ['planId'],
          _count: { planId: true },
          orderBy: { _count: { planId: 'desc' } },
        }),
      ]);

      const counts: Record<string, number> = {};
      for (const row of byStatus) counts[row.status] = row._count.status;

      const plans = await this.prisma.plan.findMany({
        where: { id: { in: byPlan.map((p) => p.planId) } },
        select: { id: true, name: true },
      });
      const planNameById = new Map(plans.map((p) => [p.id, p.name]));

      return {
        active: counts.ACTIVE ?? 0,
        expired: counts.EXPIRED ?? 0,
        canceled: counts.CANCELED ?? 0,
        byPlan: byPlan.map((p) => ({
          planName: planNameById.get(p.planId) ?? '—',
          count: p._count.planId,
        })),
      };
    });
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
   * Cấp gói thủ công (admin / hỗ trợ KH) — không qua thanh toán.
   * Tạo mới subscription, đồng thời ghi 1 Order
   * provider='manual' (amount 0) kèm lý do + admin thực hiện để truy vết.
   */
  async grantManual(dto: GrantSubscriptionDto, adminId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Không tìm thấy gói');

    const days = dto.days ?? plan.durationDays;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await lockBillingUser(tx, dto.userId);

      const user = await tx.user.findUnique({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');

      const sub = await tx.subscription.findUnique({
        where: { userId: dto.userId },
      });
      if (sub?.expiresAt && sub.expiresAt > now) {
        throw new ConflictException(
          'Gói hiện tại vẫn còn hiệu lực; không thể cấp chồng thời hạn.',
        );
      }
      const expiresAt = new Date(now.getTime() + days * DAY_MS);

      // upsert theo userId (@unique) — an toàn khi 2 request cấp song song (tránh P2002).
      const subscription = await tx.subscription.upsert({
        where: { userId: dto.userId },
        create: { userId: dto.userId, planId: plan.id, expiresAt },
        update: {
          planId: plan.id,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          canceledAt: null,
          renewalReminderSentAt: null, // chu kỳ mới → lại được nhắc khi sắp hết hạn
        },
      });

      const order = await tx.order.create({
        data: {
          userId: dto.userId,
          planId: plan.id,
          subscriptionId: subscription.id,
          amountVnd: 0,
          status: 'PAID',
          provider: 'manual',
          transferCode:
            'MANUAL-' +
            randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase(),
          paidAt: now,
          periodEnd: expiresAt,
          expiresAt: now, // không áp dụng cho cấp tay
          note: dto.note,
          grantedById: adminId,
        },
      });
      await this.aiCredits.openCycleInTransaction(tx, {
        userId: dto.userId,
        subscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.name,
        source: CreditCycleSource.MANUAL,
        sourceReference: order.id,
        startsAt: now,
        endsAt: expiresAt,
        grantedCredits: plan.creditPerCycle,
      });

      return tx.subscription.findUniqueOrThrow({
        where: { id: subscription.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { name: true, slug: true, durationDays: true } },
        },
      });
    });
  }
}
