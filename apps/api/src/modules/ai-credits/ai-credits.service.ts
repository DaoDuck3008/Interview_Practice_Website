import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AiCreditFeature,
  CreditCycleSource,
  CreditReservationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { lockBillingUser } from '../../common/utils/billing-lock.util';
import { vnDayKey, vnStartOfDay } from '../../common/utils/vn-time.util';
import {
  FREE_DAILY_AI_CREDITS,
  getAiCreditCost,
  getReservationTtlMs,
  mockCvTotalCreditCost,
} from './ai-credit-pricing';

type TransactionClient = Prisma.TransactionClient;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface OpenCreditCycleInput {
  userId: string;
  startsAt: Date;
  endsAt: Date;
  grantedCredits: number;
  source: CreditCycleSource;
  sourceReference: string;
  subscriptionId?: string;
  planId?: string;
  planName?: string;
}

export interface ReserveAiCreditsInput {
  userId: string;
  feature: AiCreditFeature;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
}

function creditException(
  errorCode: string,
  message: string,
  status: HttpStatus,
) {
  return new HttpException({ errorCode, message }, status);
}

@Injectable()
export class AiCreditsService {
  private readonly logger = new Logger(AiCreditsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const cycle = await this.getOrCreateActiveCycle(userId);
    return this.toBalance(cycle);
  }

  getPricing() {
    return {
      mockCv: {
        totalCreditsByQuestionCount: {
          10: mockCvTotalCreditCost(10),
          20: mockCvTotalCreditCost(20),
          30: mockCvTotalCreditCost(30),
        },
      },
    };
  }

  /** Kiểm tra số dư server-side trước khi mở luồng AI nhiều bước. */
  async assertAvailable(userId: string, requiredCredits: number) {
    if (!Number.isInteger(requiredCredits) || requiredCredits <= 0) {
      throw new BadRequestException('Số AI credits cần kiểm tra không hợp lệ.');
    }

    return this.prisma.$transaction(async (tx) => {
      await lockBillingUser(tx, userId);
      const cycle = await this.getOrCreateActiveCycleInTransaction(
        tx,
        userId,
        new Date(),
      );
      const balance = this.toBalance(cycle);
      if (balance.available < requiredCredits) {
        throw creditException(
          'AI_CREDITS_EXHAUSTED',
          `Bạn cần ít nhất ${requiredCredits} AI credits để hoàn thành bài Mock CV này.`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      return balance;
    });
  }

  /** Số liệu vận hành được aggregate tại DB, không tải lịch sử reservation lên bộ nhớ. */
  async getAdminSummary() {
    const now = new Date();
    const reservationWindowStartsAt = new Date(now.getTime() - 30 * DAY_MS);
    const [cycles, reservations] = await Promise.all([
      this.prisma.creditCycle.aggregate({
        where: { activeKey: { not: null }, endsAt: { gt: now } },
        _count: { _all: true },
        _sum: {
          grantedCredits: true,
          usedCredits: true,
          reservedCredits: true,
        },
      }),
      this.prisma.creditReservation.groupBy({
        by: ['feature', 'status'],
        where: { createdAt: { gte: reservationWindowStartsAt } },
        _count: { _all: true },
        _sum: { credits: true },
      }),
    ]);

    return {
      activeCycles: cycles._count._all,
      grantedCredits: cycles._sum.grantedCredits ?? 0,
      usedCredits: cycles._sum.usedCredits ?? 0,
      reservedCredits: cycles._sum.reservedCredits ?? 0,
      reservationWindowStartsAt,
      reservations: reservations.map((item) => ({
        feature: item.feature,
        status: item.status,
        count: item._count._all,
        credits: item._sum.credits ?? 0,
      })),
    };
  }

  /** Trả cycle paid đang hiệu lực, hoặc tạo trial cycle của ngày Việt Nam. */
  async getOrCreateActiveCycle(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockBillingUser(tx, userId);
      return this.getOrCreateActiveCycleInTransaction(tx, userId, new Date());
    });
  }

  // ─── Cycle lifecycle ────────────────────────────────────────────────

  /* Hàm này được dùng khi hệ thống đã biết chính xác cần mở cycle free hay paid tier */
  /** Dùng trong billing transaction đã giữ `billing:<userId>` lock. */
  async openCycleInTransaction(
    tx: TransactionClient,
    input: OpenCreditCycleInput,
    now = new Date(),
  ) {
    /* sourceReference nhằm chỉ xem cycle đã được sinh ra ở sự kiện nào
        Nó đảm bảo cycle đã được cấp trước đó rồi
    */
    // Nếu tìm thấy cycle theo sourceReference thì trả luôn.
    const bySource = await tx.creditCycle.findUnique({
      where: { sourceReference: input.sourceReference },
    });
    if (bySource) return bySource;

    // Nếu không tìm thấy => thì phải kiểm tra lại xem cycle đã có chưa từ đầu

    // Vô hiệu hóa các cycle đã hết hạn trước đó để giải phóng activeKey hợp lệ
    const activeKey = this.activeKey(input.userId);
    await tx.creditCycle.updateMany({
      where: { activeKey, endsAt: { lte: now } },
      data: { activeKey: null },
    });

    const existing = await tx.creditCycle.findUnique({ where: { activeKey } });
    if (existing) {
      // User có thể dùng trial rồi mua gói trong cùng ngày. Cycle paid thay thế
      // trial còn lại, nhưng không bao giờ ghi đè cycle paid/manual đang hiệu lực.
      if (
        existing.source === CreditCycleSource.FREE &&
        input.source !== CreditCycleSource.FREE
      ) {
        await tx.creditCycle.update({
          where: { id: existing.id },
          data: { activeKey: null },
        });
      } else {
        throw creditException(
          'CREDIT_CYCLE_CONFLICT',
          'Người dùng đã có một chu kỳ credit đang hiệu lực.',
          HttpStatus.CONFLICT,
        );
      }
    }
    return tx.creditCycle.create({ data: { ...input, activeKey } });
  }

  // ─── Reservation lifecycle ───────────────────────────────────────────

  /** Giữ credit theo giá server-side trước khi gọi provider hoặc enqueue job. */
  async reserve(input: ReserveAiCreditsInput) {
    // Lấy giá credits cần cho feature đó từ bảng giá credit.
    const credits = getAiCreditCost(input.feature);
    if (credits <= 0) {
      throw new BadRequestException('Tác vụ này không cần reserve AI credits.');
    }

    return this.prisma.$transaction(async (tx) => {
      await lockBillingUser(tx, input.userId);

      const existing = await tx.creditReservation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      let reusableReservationId: string | null = null;
      if (existing) {
        const sameAction =
          existing.userId === input.userId &&
          existing.feature === input.feature &&
          existing.referenceType === input.referenceType &&
          existing.referenceId === input.referenceId;
        if (!sameAction) {
          throw creditException(
            'CREDIT_RESERVATION_CONFLICT',
            'Idempotency key đã thuộc về một thao tác khác.',
            HttpStatus.CONFLICT,
          );
        }
        if (
          existing.status === CreditReservationStatus.PENDING ||
          existing.status === CreditReservationStatus.CONSUMED
        ) {
          this.logCreditEvent('reserve_idempotent', existing);
          return existing;
        }
        reusableReservationId = existing.id;
      }

      const now = new Date();
      const activeKey = this.activeKey(input.userId);
      const cycle = await this.getOrCreateActiveCycleInTransaction(
        tx,
        input.userId,
        now,
      );

      // Update có điều kiện trên snapshot counter để không overspend nếu có
      // writer khác ngoài service này; advisory lock bảo vệ request cùng user.
      const claimed = await tx.creditCycle.updateMany({
        where: {
          id: cycle.id,
          activeKey,
          endsAt: { gt: now },
          usedCredits: cycle.usedCredits,
          reservedCredits: {
            equals: cycle.reservedCredits,
            lte: cycle.grantedCredits - cycle.usedCredits - credits,
          },
        },
        data: { reservedCredits: { increment: credits } },
      });
      if (claimed.count === 0) {
        this.logger.warn(
          JSON.stringify({
            event: 'ai_credit_insufficient',
            feature: input.feature,
            credits,
          }),
        );
        throw creditException(
          'AI_CREDITS_EXHAUSTED',
          'AI credits hiện không còn đủ cho tác vụ này.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const data = {
        cycleId: cycle.id,
        userId: input.userId,
        feature: input.feature,
        credits,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
        expiresAt: new Date(now.getTime() + getReservationTtlMs(input.feature)),
      };
      if (reusableReservationId) {
        const reservation = await tx.creditReservation.update({
          where: { id: reusableReservationId },
          data: {
            ...data,
            status: CreditReservationStatus.PENDING,
            consumedAt: null,
            releasedAt: null,
            failureReason: null,
          },
        });
        this.logCreditEvent('reserve_reactivated', reservation);
        return reservation;
      }
      const reservation = await tx.creditReservation.create({ data });
      this.logCreditEvent('reserve', reservation);
      return reservation;
    });
  }

  /** Consume là idempotent: gọi lại reservation đã CONSUMED không trừ thêm credit. */
  async consume(reservationId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation)
        throw new NotFoundException('Không tìm thấy credit reservation.');
      await lockBillingUser(tx, reservation.userId);

      if (reservation.status === CreditReservationStatus.CONSUMED) {
        return { kind: 'consumed' as const, reservation };
      }
      if (reservation.status !== CreditReservationStatus.PENDING) {
        throw creditException(
          'CREDIT_RESERVATION_CONFLICT',
          'Credit reservation không còn có thể consume.',
          HttpStatus.CONFLICT,
        );
      }
      if (reservation.expiresAt <= new Date()) {
        await this.releasePendingInTransaction(
          tx,
          reservation,
          CreditReservationStatus.EXPIRED,
          'Reservation hết hạn trước khi hoàn tất.',
        );
        return { kind: 'expired' as const };
      }

      const consumedAt = new Date();
      const consumed = await tx.creditReservation.update({
        where: { id: reservation.id },
        data: {
          status: CreditReservationStatus.CONSUMED,
          consumedAt,
          expiresAt: consumedAt,
        },
      });
      await tx.creditCycle.update({
        where: { id: reservation.cycleId },
        data: {
          reservedCredits: { decrement: reservation.credits },
          usedCredits: { increment: reservation.credits },
        },
      });
      this.logCreditEvent('consume', consumed);
      return { kind: 'consumed' as const, reservation: consumed };
    });

    if (result.kind === 'expired') {
      throw creditException(
        'CREDIT_RESERVATION_EXPIRED',
        'Credit reservation đã hết hạn.',
        HttpStatus.CONFLICT,
      );
    }
    return result.reservation;
  }

  /** Worker dùng reference đã biết thay vì phải mang reservationId trong payload queue. */
  async consumeByIdempotencyKey(idempotencyKey: string) {
    const reservation = await this.prisma.creditReservation.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    });
    if (
      !reservation ||
      (reservation.status !== CreditReservationStatus.PENDING &&
        reservation.status !== CreditReservationStatus.CONSUMED)
    ) {
      return null;
    }
    return this.consume(reservation.id);
  }

  async consumeByReference(
    userId: string,
    referenceType: string,
    referenceId: string,
  ) {
    const reservation = await this.prisma.creditReservation.findFirst({
      where: { userId, referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });
    if (
      !reservation ||
      (reservation.status !== CreditReservationStatus.PENDING &&
        reservation.status !== CreditReservationStatus.CONSUMED)
    ) {
      return null;
    }
    return this.consume(reservation.id);
  }

  /** Release là idempotent; retry release không thay đổi balance lần thứ hai. */
  async release(reservationId: string, failureReason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation)
        throw new NotFoundException('Không tìm thấy credit reservation.');
      await lockBillingUser(tx, reservation.userId);

      if (reservation.status !== CreditReservationStatus.PENDING) {
        return reservation;
      }
      return this.releasePendingInTransaction(
        tx,
        reservation,
        CreditReservationStatus.RELEASED,
        failureReason,
      );
    });
  }

  async releaseByIdempotencyKey(
    idempotencyKey: string,
    failureReason?: string,
  ) {
    const reservation = await this.prisma.creditReservation.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (!reservation) return null;
    return this.release(reservation.id, failureReason);
  }

  async releaseByReference(
    userId: string,
    referenceType: string,
    referenceId: string,
    failureReason?: string,
  ) {
    const reservation = await this.prisma.creditReservation.findFirst({
      where: { userId, referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return reservation ? this.release(reservation.id, failureReason) : null;
  }

  /** Worker gọi khi đã bắt đầu để tránh queue delay làm reservation hết hạn. */
  async extendReservation(reservationId: string, minimumExpiresAt?: Date) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation)
        throw new NotFoundException('Không tìm thấy credit reservation.');
      await lockBillingUser(tx, reservation.userId);

      if (reservation.status !== CreditReservationStatus.PENDING) {
        return { kind: 'unchanged' as const, reservation };
      }
      const now = new Date();
      if (reservation.expiresAt <= now) {
        await this.releasePendingInTransaction(
          tx,
          reservation,
          CreditReservationStatus.EXPIRED,
          'Reservation hết hạn trước khi worker bắt đầu.',
        );
        return { kind: 'expired' as const };
      }

      const expiresAt = new Date(
        now.getTime() + getReservationTtlMs(reservation.feature),
      );
      const targetExpiresAt = [
        reservation.expiresAt,
        expiresAt,
        ...(minimumExpiresAt ? [minimumExpiresAt] : []),
      ].reduce((latest, item) => (item > latest ? item : latest));
      const extended = await tx.creditReservation.update({
        where: { id: reservation.id },
        data: { expiresAt: targetExpiresAt },
      });
      return { kind: 'extended' as const, reservation: extended };
    });

    if (result.kind === 'expired') {
      throw creditException(
        'CREDIT_RESERVATION_EXPIRED',
        'Credit reservation đã hết hạn.',
        HttpStatus.CONFLICT,
      );
    }
    return result.reservation;
  }

  async extendByIdempotencyKey(
    idempotencyKey: string,
    minimumExpiresAt?: Date,
  ) {
    const reservation = await this.prisma.creditReservation.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (!reservation) return null;
    return this.extendReservation(reservation.id, minimumExpiresAt);
  }

  async extendByReference(
    userId: string,
    referenceType: string,
    referenceId: string,
  ) {
    const reservation = await this.prisma.creditReservation.findFirst({
      where: { userId, referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return reservation ? this.extendReservation(reservation.id) : null;
  }

  // ─── Vận hành ────────────────────────────────────────────────────────

  /** Cron dọn dẹp các reservation đã hết hạn. */
  @Cron('*/5 * * * *')
  async expireReservations() {
    const expired = await this.prisma.creditReservation.findMany({
      where: {
        status: CreditReservationStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      select: { id: true },
      take: 100,
      orderBy: { expiresAt: 'asc' },
    });

    let released = 0;
    for (const item of expired) {
      const changed = await this.prisma.$transaction(async (tx) => {
        const reservation = await tx.creditReservation.findUnique({
          where: { id: item.id },
        });
        if (
          !reservation ||
          reservation.status !== CreditReservationStatus.PENDING ||
          reservation.expiresAt > new Date()
        ) {
          return false;
        }
        await lockBillingUser(tx, reservation.userId);
        await this.releasePendingInTransaction(
          tx,
          reservation,
          CreditReservationStatus.EXPIRED,
          'Cron dọn reservation hết hạn.',
        );
        return true;
      });
      if (changed) released++;
    }

    if (released > 0) {
      this.logger.log(`Đã release ${released} AI credit reservation hết hạn.`);
    }
    return released;
  }

  /** Chỉ báo lệch số dư để vận hành xử lý có kiểm soát; không tự sửa dữ liệu. */
  async reconcileBalances() {
    const cycles = await this.prisma.creditCycle.findMany({
      select: {
        id: true,
        usedCredits: true,
        reservedCredits: true,
        reservations: {
          select: { status: true, credits: true, expiresAt: true },
        },
      },
    });
    const now = new Date();

    return cycles.flatMap((cycle) => {
      const expectedUsed = cycle.reservations
        .filter((item) => item.status === CreditReservationStatus.CONSUMED)
        .reduce((total, item) => total + item.credits, 0);
      const expectedReserved = cycle.reservations
        .filter(
          (item) =>
            item.status === CreditReservationStatus.PENDING &&
            item.expiresAt > now,
        )
        .reduce((total, item) => total + item.credits, 0);

      return expectedUsed === cycle.usedCredits &&
        expectedReserved === cycle.reservedCredits
        ? []
        : [
            {
              cycleId: cycle.id,
              actual: {
                used: cycle.usedCredits,
                reserved: cycle.reservedCredits,
              },
              expected: { used: expectedUsed, reserved: expectedReserved },
            },
          ];
    });
  }

  // ─── Internal helpers ─────────────────────────────────────────────────

  private toBalance(cycle: {
    id: string;
    source: CreditCycleSource;
    planName: string | null;
    startsAt: Date;
    endsAt: Date;
    grantedCredits: number;
    usedCredits: number;
    reservedCredits: number;
  }) {
    return {
      cycleId: cycle.id,
      source: cycle.source,
      planName: cycle.planName,
      granted: cycle.grantedCredits,
      used: cycle.usedCredits,
      reserved: cycle.reservedCredits,
      available:
        cycle.grantedCredits - cycle.usedCredits - cycle.reservedCredits,
      cycleStartsAt: cycle.startsAt,
      cycleEndsAt: cycle.endsAt,
    };
  }

  /* Hàm này được dùng khi user cần credit, nhưng chưa biết họ thuộc free hay paid tier
     Lấy hoặc tạo Cycle mới cho những người dùng Free tier (3 credits / ngày)
     Đối với người dùng đã đăng ký rồi (có subscription) thì tạo cycle mới với credit theo plan */
  private async getOrCreateActiveCycleInTransaction(
    tx: TransactionClient,
    userId: string,
    now: Date,
  ) {
    // Vô hiệu hóa hết các cycle cũ đã hết hạn để tạo mới activeKey hợp lệ.
    const activeKey = this.activeKey(userId);
    await tx.creditCycle.updateMany({
      where: { activeKey, endsAt: { lte: now } },
      data: { activeKey: null },
    });

    // nếu có cycle đang active hợp lệ thì trả luôn
    const active = await tx.creditCycle.findUnique({ where: { activeKey } });
    if (active) return active;

    // Nếu không thì kiểm tra subscription
    const subscription = await tx.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    // Nếu có subscription hợp lệ (chưa hết hạn) thì gọi tới openCycleInTransaction để xử lý theo plan đã mua
    if (
      subscription &&
      subscription.expiresAt &&
      subscription.expiresAt > now
    ) {
      return this.openCycleInTransaction(
        tx,
        {
          userId,
          subscriptionId: subscription.id,
          planId: subscription.planId,
          planName: subscription.plan.name,
          source: CreditCycleSource.SUBSCRIPTION,
          sourceReference: `subscription:${subscription.id}:${subscription.startedAt.toISOString()}`,
          startsAt: subscription.startedAt,
          endsAt: subscription.expiresAt,
          grantedCredits: subscription.plan.creditPerCycle,
        },
        now,
      );
    }

    // Nếu ko có subscription => Nghĩa là người dùng free tier thì gọi openCycleInTransaction để tạo cycle Free tier
    const startsAt = vnStartOfDay(now);
    return this.openCycleInTransaction(
      tx,
      {
        userId,
        source: CreditCycleSource.FREE,
        sourceReference: `free:${userId}:${vnDayKey(now)}`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + DAY_MS),
        grantedCredits: FREE_DAILY_AI_CREDITS,
      },
      now,
    );
  }

  private activeKey(userId: string) {
    return `ai-credit:active:${userId}`;
  }

  private async releasePendingInTransaction(
    tx: TransactionClient,
    reservation: {
      id: string;
      cycleId: string;
      credits: number;
      status: CreditReservationStatus;
      feature: AiCreditFeature;
      createdAt: Date;
    },
    status: 'RELEASED' | 'EXPIRED',
    failureReason?: string,
  ) {
    const releasedAt = new Date();
    const released = await tx.creditReservation.update({
      where: { id: reservation.id },
      data: {
        status,
        releasedAt,
        expiresAt: releasedAt,
        failureReason,
      },
    });
    await tx.creditCycle.update({
      where: { id: reservation.cycleId },
      data: { reservedCredits: { decrement: reservation.credits } },
    });
    this.logCreditEvent(
      status === CreditReservationStatus.EXPIRED ? 'expire' : 'release',
      released,
      failureReason,
    );
    return released;
  }

  private logCreditEvent(
    event: string,
    reservation: {
      id: string;
      feature: AiCreditFeature;
      credits: number;
      status: CreditReservationStatus;
      createdAt: Date;
    },
    reason?: string,
  ) {
    this.logger.log(
      JSON.stringify({
        event: `ai_credit_${event}`,
        reservationId: reservation.id,
        feature: reservation.feature,
        credits: reservation.credits,
        status: reservation.status,
        reservationAgeMs: Math.max(
          0,
          Date.now() - reservation.createdAt.getTime(),
        ),
        ...(reason && { reason }),
      }),
    );
  }
}
