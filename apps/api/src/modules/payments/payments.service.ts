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
import { QueryOrderDto, OrderDateField } from './dto/query-order.dto';
import { SepayClient, type SepayTransaction } from './sepay.client';
import { MailService } from '../mail/mail.service';

// Việt Nam cố định UTC+7 — dùng để tính mốc "hôm nay/tháng này" theo giờ VN.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

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
    private sepay: SepayClient,
    private mail: MailService,
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

    const { paidAt, periodEnd } = await this.activateOrder(
      order,
      txnId,
      payload,
    );
    this.logger.log(`Đơn ${order.id} đã thanh toán & kích hoạt subscription.`);
    // Gửi biên nhận best-effort — không để lỗi email làm hỏng phản hồi webhook.
    void this.sendReceiptEmail(order, paidAt, periodEnd);
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

  // ─── Admin: sổ cái giao dịch ──────────────

  /** Dựng where cho danh sách/đối soát admin từ bộ lọc. */
  private buildAdminOrderWhere(query: QueryOrderDto): Prisma.OrderWhereInput {
    const field = query.dateField ?? OrderDateField.CREATED;
    const range =
      query.from || query.to
        ? {
            ...(query.from && { gte: new Date(query.from) }),
            ...(query.to && {
              lte: new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`),
            }),
          }
        : undefined;

    return {
      ...(query.status && { status: query.status }),
      ...(range && { [field]: range }),
      ...(query.search && {
        OR: [
          { transferCode: { contains: query.search, mode: 'insensitive' } },
          { providerTxnId: { contains: query.search, mode: 'insensitive' } },
          {
            user: {
              is: {
                OR: [
                  { name: { contains: query.search, mode: 'insensitive' } },
                  { email: { contains: query.search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      }),
    };
  }

  private static readonly ADMIN_LIST_SELECT = {
    id: true,
    amountVnd: true,
    status: true,
    provider: true,
    transferCode: true,
    providerTxnId: true,
    paidAt: true,
    createdAt: true,
    user: { select: { id: true, name: true, email: true } },
    plan: { select: { name: true, slug: true } },
  } satisfies Prisma.OrderSelect;

  /** Danh sách đơn cho admin (sổ cái) — lọc + phân trang, mọi trạng thái. */
  async findAllAdmin(query: QueryOrderDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const where = this.buildAdminOrderWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: PaymentsService.ADMIN_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** Toàn bộ đơn khớp bộ lọc (không phân trang) để xuất CSV. Giới hạn an toàn 5000 dòng. */
  async getOrdersForExport(query: QueryOrderDto) {
    return this.prisma.order.findMany({
      where: this.buildAdminOrderWhere(query),
      select: PaymentsService.ADMIN_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  /** Chi tiết 1 đơn cho admin (đối soát) — gồm rawPayload, providerTxnId, subscription liên quan. */
  async getOrderAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, slug: true, durationDays: true } },
        subscription: {
          select: { id: true, status: true, expiresAt: true },
        },
        grantedBy: { select: { name: true, email: true } },
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  /** Thẻ thống kê: doanh thu (tổng / tháng này / hôm nay) + đếm theo trạng thái. */
  async getStats() {
    const nowMs = Date.now();
    const vnNow = new Date(nowMs + VN_OFFSET_MS);
    // Mốc đầu ngày/tháng theo giờ VN, quy về Date (UTC) để so với paidAt đã lưu UTC.
    const startOfDay = new Date(
      Date.UTC(
        vnNow.getUTCFullYear(),
        vnNow.getUTCMonth(),
        vnNow.getUTCDate(),
      ) - VN_OFFSET_MS,
    );
    const startOfMonth = new Date(
      Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), 1) - VN_OFFSET_MS,
    );

    // Promise.all (không dùng $transaction) để giữ kiểu trả về chính xác của groupBy.
    const [byStatus, totalAgg, monthAgg, todayAgg] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amountVnd: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { amountVnd: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfDay } },
        _sum: { amountVnd: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of byStatus) counts[row.status] = row._count.id;

    return {
      revenueTotal: totalAgg._sum.amountVnd ?? 0,
      revenueMonth: monthAgg._sum.amountVnd ?? 0,
      revenueToday: todayAgg._sum.amountVnd ?? 0,
      counts,
    };
  }

  // ─── Admin: đối soát ngân hàng (Sepay) ──────────────

  /** FE dùng để biết tab đối soát có khả dụng không. */
  getReconcileConfig() {
    return { configured: this.sepay.isConfigured() };
  }

  /**
   * Đối soát giao dịch ngân hàng (Sepay) với bảng Order trong khoảng ngày.
   * Read-only: KHÔNG ghi gì vào DB. Phân loại mỗi giao dịch tiền vào thành:
   *  - matched : khớp đơn PAID, đúng số tiền.
   *  - mismatch: khớp đơn nhưng lệch tiền hoặc đơn chưa PAID (webhook lỡ / thiếu tiền).
   *  - orphan  : không khớp đơn nào (tiền về sai nội dung) — bảng Order không thấy được.
   */
  async reconcile(from: string, to: string) {
    const txns = await this.sepay.listIncoming({
      dateFrom: from.slice(0, 10),
      dateTo: to.slice(0, 10),
    });

    // Trích mã đơn (CODE_PREFIX + 10 hex) từ code / nội dung / mã tham chiếu.
    const codeRe = new RegExp(`${CODE_PREFIX}[0-9A-F]{10}`);
    const extractCode = (t: SepayTransaction): string | null => {
      const hay =
        `${t.code ?? ''} ${t.transaction_content ?? ''} ${t.reference_number ?? ''}`
          .toUpperCase()
          .replace(/\s+/g, '');
      return hay.match(codeRe)?.[0] ?? null;
    };

    const withCode = txns.map((t) => ({ t, code: extractCode(t) }));
    const codes = [
      ...new Set(
        withCode.map((x) => x.code).filter((c): c is string => Boolean(c)),
      ),
    ];

    const orders = codes.length
      ? await this.prisma.order.findMany({
          where: { transferCode: { in: codes } },
          select: {
            id: true,
            transferCode: true,
            amountVnd: true,
            status: true,
            user: { select: { name: true, email: true } },
            plan: { select: { name: true } },
          },
        })
      : [];
    const orderByCode = new Map(orders.map((o) => [o.transferCode, o]));

    type Base = {
      txnId: string;
      date: string;
      amountIn: number;
      content: string | null;
      referenceNumber: string | null;
      code: string | null;
      bankBrand: string | null;
    };
    const matched: (Base & { order: (typeof orders)[number] })[] = [];
    const mismatch: (Base & {
      order: (typeof orders)[number];
      reason: string;
    })[] = [];
    const orphan: Base[] = [];

    for (const { t, code } of withCode) {
      const base: Base = {
        txnId: t.id,
        date: t.transaction_date,
        amountIn: t.amount_in,
        content: t.transaction_content,
        referenceNumber: t.reference_number,
        code,
        bankBrand: t.bank_brand_name,
      };
      const order = code ? orderByCode.get(code) : undefined;
      if (!order) {
        orphan.push(base);
      } else if (order.status === 'PAID' && t.amount_in === order.amountVnd) {
        matched.push({ ...base, order });
      } else {
        const reason =
          order.status !== 'PAID'
            ? `Đơn đang ở trạng thái ${order.status} (chưa PAID)`
            : `Lệch tiền: nhận ${t.amount_in} ≠ cần ${order.amountVnd}`;
        mismatch.push({ ...base, order, reason });
      }
    }

    const totalAmountIn = txns.reduce((s, t) => s + t.amount_in, 0);
    return {
      from,
      to,
      summary: {
        total: txns.length,
        matched: matched.length,
        mismatch: mismatch.length,
        orphan: orphan.length,
        totalAmountIn,
      },
      matched,
      mismatch,
      orphan,
    };
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
  ): Promise<{ paidAt: Date; periodEnd: Date }> {
    const now = new Date();
    let periodEnd = now;
    await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { userId: order.userId },
      });
      // Còn hạn → cộng dồn; đã hết hạn (hoặc chưa có) → tính từ hôm nay.
      const base = sub && sub.expiresAt > now ? sub.expiresAt : now;
      const expiresAt = new Date(
        base.getTime() + order.plan.durationDays * DAY_MS,
      );
      periodEnd = expiresAt;

      let subscriptionId: string;
      if (sub) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            planId: order.planId,
            status: 'ACTIVE',
            expiresAt,
            canceledAt: null,
            renewalReminderSentAt: null,
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
    return { paidAt: now, periodEnd };
  }

  /**
   * Gửi email biên nhận + xác nhận mua gói thành công. Best-effort:
   * nuốt lỗi (chỉ log) để không ảnh hưởng phản hồi webhook cho Sepay.
   */
  private async sendReceiptEmail(
    order: Order & { plan: Plan },
    paidAt: Date,
    periodEnd: Date,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true, name: true },
      });
      if (!user) return;
      await this.mail.sendPurchaseReceipt(user.email, {
        name: user.name,
        planName: order.plan.name,
        amountVnd: order.amountVnd,
        transferCode: order.transferCode,
        paidAt,
        periodEnd,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Không gửi được email biên nhận cho đơn ${order.id}: ${msg}`,
      );
    }
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
