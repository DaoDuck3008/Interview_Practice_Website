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
import { getAiCreditCost, getReservationTtlMs } from './ai-credit-pricing';

type TransactionClient = Prisma.TransactionClient;

export interface OpenCreditCycleInput {
  userId: string;
  startsAt: Date;
  endsAt: Date;
  grantedCredits: number;
  source: CreditCycleSource;
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
    const now = new Date();
    const cycle = await this.prisma.creditCycle.findFirst({
      where: { userId, activeKey: this.activeKey(userId), endsAt: { gt: now } },
      select: {
        id: true,
        source: true,
        planName: true,
        startsAt: true,
        endsAt: true,
        grantedCredits: true,
        usedCredits: true,
        reservedCredits: true,
      },
    });

    if (!cycle) {
      return {
        cycleId: null,
        source: null,
        planName: null,
        granted: 0,
        used: 0,
        reserved: 0,
        available: 0,
        cycleStartsAt: null,
        cycleEndsAt: null,
      };
    }

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

  /** Mở cycle đang hiệu lực; Phase 3 sẽ gọi khi payment/grant hoàn tất. */
  async openCycle(input: OpenCreditCycleInput) {
    if (input.grantedCredits < 0) {
      throw new BadRequestException('Credit được cấp không được âm.');
    }
    if (input.endsAt <= input.startsAt) {
      throw new BadRequestException(
        'Thời gian kết thúc cycle phải sau thời gian bắt đầu.',
      );
    }

    const now = new Date();
    if (input.startsAt > now) {
      throw new BadRequestException('Chưa hỗ trợ mở cycle trong tương lai.');
    }

    return this.prisma.$transaction(async (tx) => {
      await lockBillingUser(tx, input.userId);
      const activeKey = this.activeKey(input.userId);

      await tx.creditCycle.updateMany({
        where: { activeKey, endsAt: { lte: now } },
        data: { activeKey: null },
      });

      const existing = await tx.creditCycle.findUnique({
        where: { activeKey },
      });
      if (existing) {
        if (
          existing.subscriptionId === (input.subscriptionId ?? null) &&
          existing.startsAt.getTime() === input.startsAt.getTime() &&
          existing.endsAt.getTime() === input.endsAt.getTime()
        ) {
          return existing;
        }
        throw creditException(
          'CREDIT_RESERVATION_CONFLICT',
          'Người dùng đã có một chu kỳ credit đang hiệu lực.',
          HttpStatus.CONFLICT,
        );
      }

      return tx.creditCycle.create({
        data: { ...input, activeKey },
      });
    });
  }

  async grantCycle(input: OpenCreditCycleInput) {
    return this.openCycle(input);
  }

  /** Giữ credit theo giá server-side trước khi gọi provider hoặc enqueue job. */
  async reserve(input: ReserveAiCreditsInput) {
    const credits = getAiCreditCost(input.feature);
    if (credits <= 0) {
      throw new BadRequestException('Tác vụ này không cần reserve AI credits.');
    }

    return this.prisma.$transaction(async (tx) => {
      await lockBillingUser(tx, input.userId);

      const existing = await tx.creditReservation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        if (
          existing.userId === input.userId &&
          existing.feature === input.feature &&
          existing.referenceType === input.referenceType &&
          existing.referenceId === input.referenceId
        ) {
          return existing;
        }
        throw creditException(
          'CREDIT_RESERVATION_CONFLICT',
          'Idempotency key đã thuộc về một thao tác khác.',
          HttpStatus.CONFLICT,
        );
      }

      const now = new Date();
      const activeKey = this.activeKey(input.userId);
      const cycle = await tx.creditCycle.findUnique({ where: { activeKey } });
      if (!cycle || cycle.endsAt <= now) {
        throw creditException(
          'AI_CREDITS_EXHAUSTED',
          'Bạn chưa có AI credits đang hiệu lực.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

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
        throw creditException(
          'AI_CREDITS_EXHAUSTED',
          'AI credits hiện không còn đủ cho tác vụ này.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      return tx.creditReservation.create({
        data: {
          cycleId: cycle.id,
          userId: input.userId,
          feature: input.feature,
          credits,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          idempotencyKey: input.idempotencyKey,
          expiresAt: new Date(
            now.getTime() + getReservationTtlMs(input.feature),
          ),
        },
      });
    });
  }

  /** Consume là idempotent: gọi lại reservation đã CONSUMED không trừ thêm credit. */
  async consume(reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation)
        throw new NotFoundException('Không tìm thấy credit reservation.');
      await lockBillingUser(tx, reservation.userId);

      if (reservation.status === CreditReservationStatus.CONSUMED) {
        return reservation;
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
        throw creditException(
          'CREDIT_RESERVATION_EXPIRED',
          'Credit reservation đã hết hạn.',
          HttpStatus.CONFLICT,
        );
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
      return consumed;
    });
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

  /** Worker gọi khi đã bắt đầu để tránh queue delay làm reservation hết hạn. */
  async extendReservation(reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation)
        throw new NotFoundException('Không tìm thấy credit reservation.');
      await lockBillingUser(tx, reservation.userId);

      if (reservation.status !== CreditReservationStatus.PENDING)
        return reservation;
      const now = new Date();
      if (reservation.expiresAt <= now) {
        await this.releasePendingInTransaction(
          tx,
          reservation,
          CreditReservationStatus.EXPIRED,
          'Reservation hết hạn trước khi worker bắt đầu.',
        );
        throw creditException(
          'CREDIT_RESERVATION_EXPIRED',
          'Credit reservation đã hết hạn.',
          HttpStatus.CONFLICT,
        );
      }

      const expiresAt = new Date(
        now.getTime() + getReservationTtlMs(reservation.feature),
      );
      return tx.creditReservation.update({
        where: { id: reservation.id },
        data: {
          expiresAt:
            reservation.expiresAt > expiresAt
              ? reservation.expiresAt
              : expiresAt,
        },
      });
    });
  }

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
    return released;
  }
}
