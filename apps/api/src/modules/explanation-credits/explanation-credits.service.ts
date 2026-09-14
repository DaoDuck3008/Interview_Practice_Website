import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  ExplanationCreditReservationStatus,
  ExplanationCreditSource,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { lockBillingUser } from '../../common/utils/billing-lock.util';
import { PrismaService } from '../../prisma/prisma.service';

const FREE_EXPLANATION_CREDITS = 10;
const RESERVATION_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ExplanationCreditsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Trả đúng balance đang có hiệu lực: paid active trước, free lifetime sau. */
  async getBalance(userId: string) {
    return this.prisma.$transaction((tx) =>
      this.getBalanceInTransaction(tx, userId),
    );
  }

  /** Giữ trước một lượt để hai request song song không tiêu cùng quota. */
  async reserveGeneration(userId: string, termId: string) {
    const idempotencyKey = `explanation:${userId}:${termId}`;
    return this.prisma.$transaction(async (tx) => {
      await lockBillingUser(tx, userId);
      const existing = await tx.explanationCreditReservation.findUnique({
        where: { idempotencyKey },
      });
      if (existing?.status === ExplanationCreditReservationStatus.PENDING)
        return existing;
      const balance = await this.getBalanceInTransaction(tx, userId);
      if (balance.available < 1) {
        throw new HttpException(
          'Bạn đã dùng hết lượt tạo giải thích mới.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      const claimed = await tx.explanationCreditCycle.updateMany({
        where: {
          id: balance.cycleId,
          usedCredits: balance.used,
          reservedCredits: balance.reserved,
        },
        data: { reservedCredits: { increment: 1 } },
      });
      if (!claimed.count)
        throw new HttpException(
          'Không thể giữ lượt giải thích. Vui lòng thử lại.',
          HttpStatus.CONFLICT,
        );
      // Một term từng lỗi được phép retry sau cooldown, nhưng phải giữ lại quota lần nữa.
      if (existing) {
        return tx.explanationCreditReservation.update({
          where: { id: existing.id },
          data: {
            cycleId: balance.cycleId,
            status: ExplanationCreditReservationStatus.PENDING,
            expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
            consumedAt: null,
            releasedAt: null,
            failureReason: null,
          },
        });
      }
      return tx.explanationCreditReservation.create({
        data: {
          cycleId: balance.cycleId,
          userId,
          referenceType: 'TechnicalTerm',
          referenceId: termId,
          idempotencyKey,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        },
      });
    });
  }

  /** Chỉ consume sau khi TechnicalTerm đã được lưu READY/MERGED thành công. */
  async consumeReservation(idempotencyKey: string) {
    return this.finalize(idempotencyKey, true);
  }

  /** Hoàn quota khi provider chưa tạo được kết quả có thể lưu. */
  async releaseReservation(idempotencyKey: string, failureReason?: string) {
    return this.finalize(idempotencyKey, false, failureReason);
  }

  @Cron('*/5 * * * *')
  /** Dọn các lượt bị giữ nếu worker/request bị ngắt giữa chừng. */
  async expireReservations() {
    const expired = await this.prisma.explanationCreditReservation.findMany({
      where: {
        status: ExplanationCreditReservationStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      select: { idempotencyKey: true },
      take: 100,
    });
    await Promise.all(
      expired.map((item) =>
        this.releaseReservation(item.idempotencyKey, 'Reservation hết hạn.'),
      ),
    );
  }

  /** Chuyển reservation và balance atomically để không âm quota khi request song song. */
  private async finalize(
    idempotencyKey: string,
    consume: boolean,
    failureReason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.explanationCreditReservation.findUnique({
        where: { idempotencyKey },
      });
      if (
        !reservation ||
        reservation.status !== ExplanationCreditReservationStatus.PENDING
      )
        return reservation;
      await lockBillingUser(tx, reservation.userId);
      const now = new Date();
      const expired = reservation.expiresAt <= now;
      const status =
        consume && !expired
          ? ExplanationCreditReservationStatus.CONSUMED
          : expired
            ? ExplanationCreditReservationStatus.EXPIRED
            : ExplanationCreditReservationStatus.RELEASED;
      const updated = await tx.explanationCreditReservation.update({
        where: { id: reservation.id },
        data: {
          status,
          consumedAt:
            status === ExplanationCreditReservationStatus.CONSUMED ? now : null,
          releasedAt:
            status !== ExplanationCreditReservationStatus.CONSUMED ? now : null,
          failureReason,
        },
      });
      await tx.explanationCreditCycle.update({
        where: { id: reservation.cycleId },
        data:
          status === ExplanationCreditReservationStatus.CONSUMED
            ? {
                reservedCredits: { decrement: 1 },
                usedCredits: { increment: 1 },
              }
            : { reservedCredits: { decrement: 1 } },
      });
      return updated;
    });
  }

  /** Paid luôn được ưu tiên; quota free chỉ dùng khi không còn gói active. */
  private async getBalanceInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
  ) {
    const now = new Date();
    const subscription = await tx.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (subscription?.status === 'ACTIVE' && subscription.expiresAt > now) {
      const sourceReference = `subscription:${subscription.id}:${subscription.startedAt.toISOString()}`;
      let cycle = await tx.explanationCreditCycle.findUnique({
        where: { sourceReference },
      });
      if (!cycle) {
        cycle = await tx.explanationCreditCycle.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            planId: subscription.planId,
            source: ExplanationCreditSource.SUBSCRIPTION,
            sourceReference,
            planName: subscription.plan.name,
            startsAt: subscription.startedAt,
            endsAt: subscription.expiresAt,
            grantedCredits: subscription.plan.explanationCreditsPerCycle,
          },
        });
      }
      return this.toBalance(cycle);
    }
    const sourceReference = `free:${userId}`;
    let cycle = await tx.explanationCreditCycle.findUnique({
      where: { sourceReference },
    });
    if (!cycle) {
      cycle = await tx.explanationCreditCycle.create({
        data: {
          userId,
          source: ExplanationCreditSource.FREE,
          sourceReference,
          startsAt: now,
          grantedCredits: FREE_EXPLANATION_CREDITS,
        },
      });
    }
    return this.toBalance(cycle);
  }

  private toBalance(cycle: {
    id: string;
    source: ExplanationCreditSource;
    planName: string | null;
    grantedCredits: number;
    usedCredits: number;
    reservedCredits: number;
    startsAt: Date;
    endsAt: Date | null;
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
}
