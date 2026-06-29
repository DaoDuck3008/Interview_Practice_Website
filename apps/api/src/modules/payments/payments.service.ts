import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Plan, Order } from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// Đơn hết hiệu lực (QR) sau 10 phút — chỉ để UX tạo lại; tiền về trễ vẫn được honor ở webhook.
const ORDER_TTL_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CODE_PREFIX = 'IPW';
// Chỉ xoá đơn PENDING đã quá hạn LÂU (giữ 2 ngày) để tiền về trễ vẫn còn đơn mà khớp webhook.
const ORDER_CLEANUP_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Tạo (hoặc tái dùng) đơn PENDING cho user + plan, trả về thông tin thanh toán + QR động. */
  async createCheckout(userId: string, planSlug: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { slug: planSlug, isActive: true },
    });
    if (!plan) throw new NotFoundException('Không tìm thấy gói');

    // Tái dùng đơn PENDING còn hạn để tránh tạo trùng khi user bấm lại.
    const existing = await this.prisma.order.findFirst({
      where: {
        userId,
        planId: plan.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    if (existing) return this.toResponse(existing, plan);

    const order = await this.prisma.order.create({
      data: {
        userId,
        planId: plan.id,
        amountVnd: plan.priceVnd,
        transferCode: this.generateCode(),
        provider: 'sepay',
        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
      },
    });
    return this.toResponse(order, plan);
  }

  /** Trạng thái đơn (để FE poll). Chỉ chủ đơn được xem. */
  async getOrderForUser(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { plan: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.userId !== userId)
      throw new ForbiddenException('Không có quyền xem đơn này');
    return this.toResponse(order, order.plan);
  }

  /**
   * Webhook Sepay: tiền về → khớp đơn theo mã nội dung, đánh dấu PAID & kích hoạt/gia hạn subscription.
   * Idempotent: webhook lặp hoặc đơn đã PAID → bỏ qua.
   */
  async handleSepayWebhook(
    payload: any,
    rawBody?: Buffer,
    signature?: string,
    timestamp?: string,
  ) {
    this.verifyWebhookSignature(rawBody, signature, timestamp);

    // Chỉ xử lý giao dịch tiền VÀO.
    const transferType = payload?.transferType;
    if (transferType && transferType !== 'in') {
      return { success: true, ignored: 'not_incoming' };
    }

    const amount = Number(payload?.transferAmount ?? payload?.amount ?? 0);
    const txnId = String(payload?.id ?? payload?.referenceCode ?? '').trim();
    const order = await this.findOrderFromPayload(payload);

    if (!order) {
      this.logger.warn(
        `Sepay webhook không khớp đơn nào. content="${payload?.content ?? ''}"`,
      );
      return { success: true, ignored: 'no_matching_order' };
    }

    // Đã xử lý rồi → idempotent.
    if (order.status === 'PAID') {
      return { success: true, ignored: 'already_paid' };
    }

    // Số tiền không đủ → ghi nhận FAILED, không kích hoạt.
    if (amount < order.amountVnd) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          rawPayload: payload as Prisma.InputJsonValue,
          providerTxnId: txnId || undefined,
        },
      });
      this.logger.warn(
        `Đơn ${order.id} thiếu tiền: nhận ${amount} < cần ${order.amountVnd}`,
      );
      return { success: true, ignored: 'underpaid' };
    }

    await this.activateOrder(order, txnId, payload);
    this.logger.log(`Đơn ${order.id} đã thanh toán & kích hoạt subscription.`);
    return { success: true };
  }

  /** Lịch sử các đơn ĐÃ THANH TOÁN của user (mới nhất trước). */
  async getPaidOrdersForUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId, status: 'PAID' },
      orderBy: { paidAt: 'desc' },
      include: {
        plan: { select: { name: true, slug: true, durationDays: true } },
      },
    });
    return orders.map((o) => ({
      id: o.id,
      amountVnd: o.amountVnd,
      paidAt: o.paidAt,
      periodEnd: o.periodEnd,
      plan: o.plan,
    }));
  }

  /**
   * Dọn các đơn PENDING đã quá hạn từ lâu (chạy mỗi giờ).
   * Chỉ xoá đơn chưa thanh toán (PENDING); KHÔNG đụng PAID/FAILED (cần giữ để đối soát).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOrders() {
    const threshold = new Date(Date.now() - ORDER_CLEANUP_GRACE_MS);
    const { count } = await this.prisma.order.deleteMany({
      where: { status: 'PENDING', expiresAt: { lt: threshold } },
    });
    if (count > 0) {
      this.logger.log(`Đã dọn ${count} đơn PENDING hết hạn.`);
    }
  }

  // ─── Helpers ───────────────────────────────────────

  /** Khớp đơn từ payload: ưu tiên field `code` Sepay parse, sau đó dò mã trong nội dung. */
  private async findOrderFromPayload(payload: any) {
    const content = String(payload?.content ?? payload?.description ?? '');
    const normalized = content.toUpperCase().replace(/\s+/g, '');

    const candidates: string[] = [];
    if (payload?.code) candidates.push(String(payload.code).toUpperCase());
    // Mã đơn = CODE_PREFIX + đúng 10 ký tự hex (xem generateCode). Match chính xác
    const matched = normalized.match(new RegExp(`${CODE_PREFIX}[0-9A-F]{10}`));
    if (matched) candidates.push(matched[0]);

    for (const code of candidates) {
      const order = await this.prisma.order.findUnique({
        where: { transferCode: code },
        include: { plan: true },
      });
      if (order) return order;
    }
    return null;
  }

  /** Đánh dấu PAID + tạo/gia hạn subscription (1–1) trong 1 transaction. */
  private async activateOrder(
    order: Order & { plan: Plan },
    txnId: string,
    payload: any,
  ) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { userId: order.userId },
      });
      // Còn hạn → cộng dồn; đã hết hạn (hoặc chưa có) → tính từ hôm nay.
      const base = sub && sub.expiresAt > now ? sub.expiresAt : now;
      const expiresAt = new Date(
        base.getTime() + order.plan.durationDays * DAY_MS,
      );

      let subscriptionId: string;
      if (sub) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            planId: order.planId,
            status: 'ACTIVE',
            expiresAt,
            canceledAt: null,
          },
        });
        subscriptionId = sub.id;
      } else {
        const created = await tx.subscription.create({
          data: { userId: order.userId, planId: order.planId, expiresAt },
        });
        subscriptionId = created.id;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: now,
          providerTxnId: txnId || undefined,
          rawPayload: payload as Prisma.InputJsonValue,
          subscriptionId,
          periodEnd: expiresAt,
        },
      });
    });
  }

  /**
   * Xác thực webhook Sepay bằng HMAC-SHA256.
   * Ký trên RAW body (đúng bytes Sepay gửi) — KHÔNG re-stringify để tránh lệch định dạng:
   *   expected = "sha256=" + HMAC_SHA256(secret, `${timestamp}.` + rawBody)
   */
  private verifyWebhookSignature(
    rawBody?: Buffer,
    signature?: string,
    timestamp?: string,
  ) {
    const secret = this.config.get<string>('sepay.webhookSecret');
    // Chưa cấu hình secret → bỏ qua verify (dev). Siết lại bằng cách set SEPAY_WEBHOOK_SECRET.
    if (!secret) {
      this.logger.warn(
        'SEPAY_WEBHOOK_SECRET chưa được set — webhook KHÔNG được xác thực.',
      );
      return;
    }
    if (!signature || !timestamp || !rawBody) {
      throw new UnauthorizedException('Thiếu chữ ký webhook');
    }

    const expected =
      'sha256=' +
      createHmac('sha256', secret)
        .update(`${timestamp}.`)
        .update(rawBody)
        .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Chữ ký webhook không hợp lệ');
    }
  }

  private generateCode() {
    return (
      CODE_PREFIX + randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
    );
  }

  /** Dựng response thanh toán + URL QR động của Sepay (tự điền số tiền + nội dung). */
  private toResponse(order: Order, plan: Plan) {
    const bankAccount = this.config.get<string>('sepay.bankAccount')!;
    const bankCode = this.config.get<string>('sepay.bankCode')!;
    const accountName = this.config.get<string>('sepay.accountName')!;

    const qrUrl =
      `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccount)}` +
      `&bank=${encodeURIComponent(bankCode)}` +
      `&amount=${order.amountVnd}` +
      `&des=${encodeURIComponent(order.transferCode)}`;

    return {
      id: order.id,
      status: order.status,
      amountVnd: order.amountVnd,
      transferCode: order.transferCode,
      expiresAt: order.expiresAt,
      plan: {
        slug: plan.slug,
        name: plan.name,
        durationDays: plan.durationDays,
      },
      qrUrl,
      bankAccount,
      bankCode,
      accountName,
    };
  }
}
