import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogInput } from './audit.types';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = [
  'password',
  'oldPassword',
  'newPassword',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'token',
  'idToken',
  'code',
  'rawPayload',
  'rawBody',
  'audioUrl',
  'transcript',
];

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  // Danh sách audit log cho admin: lọc, phân trang, chỉ trả các field nhẹ.
  async findAllAdmin(query: QueryAuditLogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const where = this.buildAdminWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          actorType: true,
          actorId: true,
          actorEmail: true,
          action: true,
          entityType: true,
          entityId: true,
          targetUserId: true,
          method: true,
          path: true,
          ip: true,
          success: true,
          errorCode: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // Chi tiết một audit log cho modal, gồm before/after/metadata.
  async findOneAdmin(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Không tìm thấy audit log');
    return log;
  }

  // Ghi audit log vào DB; lỗi ghi log không được làm hỏng request chính.
  async log(input: AuditLogInput) {
    try {
      // toJson() gọi sanitize lần cuối để mọi dữ liệu vào before/after/metadata đều an toàn.
      await this.prisma.auditLog.create({
        data: {
          actorType: input.actorType,
          actorId: input.actorId ?? null,
          actorEmail: input.actorEmail ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          targetUserId: input.targetUserId ?? null,
          method: input.method ?? null,
          path: input.path ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          before: this.toJson(input.before),
          after: this.toJson(input.after),
          metadata: this.toJson(input.metadata),
          success: input.success ?? true,
          errorCode: input.errorCode ?? null,
        },
      });
    } catch (error) {
      // Audit là best-effort: nếu DB/log lỗi thì chỉ cảnh báo, không rollback nghiệp vụ chính.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Khong ghi duoc audit log: ${message}`);
    }
  }

  private buildAdminWhere(query: QueryAuditLogDto): Prisma.AuditLogWhereInput {
    const createdAt =
      query.from || query.to
        ? {
            ...(query.from && { gte: new Date(query.from) }),
            ...(query.to && {
              lte: new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`),
            }),
          }
        : undefined;

    return {
      ...(query.action && { action: query.action }),
      ...(query.actorType && { actorType: query.actorType }),
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.targetUserId && { targetUserId: query.targetUserId }),
      ...(createdAt && { createdAt }),
      ...(query.search && {
        OR: [
          { actorEmail: { contains: query.search, mode: 'insensitive' } },
          { actorId: { contains: query.search, mode: 'insensitive' } },
          { entityId: { contains: query.search, mode: 'insensitive' } },
          { targetUserId: { contains: query.search, mode: 'insensitive' } },
          { path: { contains: query.search, mode: 'insensitive' } },
          { ip: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  // Làm sạch dữ liệu trước khi đưa vào cột JSON của AuditLog.
  sanitize(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return this.sanitizeValue(value) as Prisma.InputJsonValue;
  }

  // Lấy bản chụp tối giản của entity trước khi controller/service thay đổi.
  async snapshot(entityType: string, entityId: string) {
    // User chỉ select các field cần tra cứu, không bao giờ lấy passwordHash vào audit.
    switch (entityType) {
      case 'User':
        return this.prisma.user.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            isLock: true,
            createdAt: true,
          },
        });
      case 'Plan':
        return this.prisma.plan.findUnique({ where: { id: entityId } });
      case 'Topic':
        return this.prisma.topic.findUnique({ where: { id: entityId } });
      case 'Question':
        return this.prisma.question.findUnique({ where: { id: entityId } });
      case 'Subscription':
        return this.prisma.subscription.findUnique({
          where: { id: entityId },
        });
      case 'Order':
        return this.prisma.order.findUnique({ where: { id: entityId } });
      case 'Session':
        return this.prisma.session.findUnique({ where: { id: entityId } });
      case 'Score':
        // Các endpoint score admin đang dùng sessionId trên URL, không phải id của Score.
        return this.prisma.score.findUnique({ where: { sessionId: entityId } });
      default:
        return null;
    }
  }

  // Chuyển undefined/null/object về dạng JSON đã được sanitize.
  private toJson(value: unknown) {
    // Prisma phân biệt undefined (không set cột) với null (ghi JSON null).
    return value === undefined ? undefined : this.sanitize(value);
  }

  // Đệ quy qua object/array, che field nhạy cảm và cắt chuỗi quá dài.
  private sanitizeValue(value: unknown): unknown {
    // Date không phải JSON primitive, chuyển về ISO để lưu ổn định và đọc được.
    if (value === null) return null;
    if (value instanceof Date) return value.toISOString();
    // Array/object có thể lồng nhau nên sanitize từng phần tử/field.
    if (Array.isArray(value)) return value.map((item) => this.sanitizeValue(item));
    if (typeof value === 'string') {
      // Chặn các chuỗi lớn làm phình bảng audit, vì audit chỉ cần ngữ cảnh tóm tắt.
      return value.length > 1000 ? `${value.slice(0, 1000)}...` : value;
    }
    if (typeof value !== 'object') return value;

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      // Kiểm tra theo tên key để bắt được cả object lồng nhau như { auth: { refreshToken } }.
      if (this.isSensitiveKey(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = this.sanitizeValue(child);
      }
    }
    return out;
  }

  // Kiểm tra tên field có nằm trong nhóm không được ghi rõ vào audit log.
  private isSensitiveKey(key: string) {
    const normalized = key.toLowerCase();
    return SENSITIVE_KEYS.some((item) => normalized.includes(item.toLowerCase()));
  }
}
