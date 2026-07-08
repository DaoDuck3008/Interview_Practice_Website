import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { QueryUserDto } from './dto/query-user.dto';
import { RefreshTokenStore } from '../auth/refresh-token.store';
import { MailService } from '../mail/mail.service';
import {
  vnStartOfDay,
  vnStartOfWeek,
  vnStartOfMonth,
  vnDayKey,
  vnLastNDays,
} from '../../common/utils/vn-time.util';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATS_TTL = 60; // 1 phút — thẻ thống kê admin, chấp nhận trễ vài chục giây

// Các field an toàn để trả về client
const publicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private refreshStore: RefreshTokenStore,
    private mail: MailService,
    private cache: CacheService,
  ) {}

  // Trả về bản ghi đầy đủ (kèm passwordHash) — chỉ dùng nội bộ để xác thực/liên kết
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // Bản ghi tối giản dùng cho luồng NÓNG (refresh token) — chỉ các field cần
  // để phát hành token lại. KHÔNG join subscription/orders ở đây.
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isLock: true,
      },
    });
  }

  /** Chi tiết đầy đủ 1 user cho modal admin: thông tin tài khoản (trừ mật khẩu),
   *  gói đã đăng ký và toàn bộ lịch sử giao dịch. */
  async getAdminDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        googleId: true,
        isLock: true,
        emailVerified: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            startedAt: true,
            expiresAt: true,
            canceledAt: true,
            plan: {
              select: { name: true, slug: true, durationDays: true },
            },
          },
        },
        orders: {
          take: 10, // chỉ lấy 10 giao dịch gần nhất, muốn xem hết thì vào trang riêng
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            amountVnd: true,
            provider: true,
            transferCode: true,
            providerTxnId: true,
            paidAt: true,
            periodEnd: true,
            note: true,
            createdAt: true,
            plan: { select: { name: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const { googleId, ...rest } = user;
    return { ...rest, isGoogle: googleId !== null };
  }

  async create(data: { name: string; email: string; passwordHash: string }) {
    const exists = await this.findByEmail(data.email);
    if (exists) throw new ConflictException('Email đã được sử dụng');
    return this.prisma.user.create({
      data,
      select: publicSelect,
    });
  }

  /** Danh sách user cho admin — phân trang, lọc & sắp xếp, kèm tóm tắt gói hiện tại. */
  async findAllAdmin(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const where: Prisma.UserWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.verified !== undefined && {
        emailVerified: query.verified === 'true',
      }),
      ...(query.locked !== undefined && {
        isLock: query.locked === 'true',
      }),
      // 'free' = chưa có gói; còn lại lọc theo slug của Plan.
      ...(query.plan === 'free'
        ? { subscription: { is: null } }
        : query.plan
          ? { subscription: { plan: { slug: query.plan } } }
          : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          isLock: true,
          googleId: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              expiresAt: true,
              plan: { select: { name: true } },
            },
          },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerified,
      isLock: u.isLock,
      isGoogle: u.googleId !== null,
      createdAt: u.createdAt,
      subscription: u.subscription
        ? {
            status: u.subscription.status,
            expiresAt: u.subscription.expiresAt,
            planName: u.subscription.plan.name,
          }
        : null,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** Thẻ thống kê: tổng số user, mới hôm nay/tuần/tháng, đã khóa, kênh đăng ký. */
  async getStats() {
    return this.cache.getOrSet('stats:users', STATS_TTL, async () => {
      const startOfDay = vnStartOfDay();
      const startOfWeek = vnStartOfWeek();
      const startOfMonth = vnStartOfMonth();

      const [total, newToday, newWeek, newMonth, locked, googleCount] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
          this.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
          this.prisma.user.count({
            where: { createdAt: { gte: startOfMonth } },
          }),
          this.prisma.user.count({ where: { isLock: true } }),
          this.prisma.user.count({ where: { googleId: { not: null } } }),
        ]);

      return {
        total,
        newToday,
        newWeek,
        newMonth,
        locked,
        googleCount,
        localCount: total - googleCount,
      };
    });
  }

  /** User đăng ký mới theo ngày (giờ VN) trong `days` ngày gần nhất, zero-fill. */
  async getRegistrationsDaily(days = 30) {
    return this.cache.getOrSet(
      `stats:users:registrations:${days}`,
      STATS_TTL,
      async () => {
        const since = vnStartOfDay(new Date(Date.now() - (days - 1) * DAY_MS));
        const users = await this.prisma.user.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true },
        });

        const map = new Map<string, number>();
        for (const u of users) {
          const day = vnDayKey(u.createdAt);
          map.set(day, (map.get(day) ?? 0) + 1);
        }

        return vnLastNDays(days).map((date) => ({
          date,
          count: map.get(date) ?? 0,
        }));
      },
    );
  }

  // Lấy user (nội bộ admin) + chặn thao tác lên tài khoản không tồn tại.
  private async getOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  /** Khóa/mở khóa tài khoản. Khi khóa: thu hồi toàn bộ phiên đăng nhập. */
  async setLock(id: string, isLock: boolean) {
    const user = await this.getOrThrow(id);
    if (user.role === Role.ADMIN)
      throw new ForbiddenException('Không thể khóa tài khoản quản trị viên');

    await this.prisma.user.update({ where: { id }, data: { isLock } });
    if (isLock) await this.refreshStore.removeAll(id);
    return { id, isLock };
  }

  /** Xác thực email thủ công (bỏ qua bước nhập mã). */
  async verifyManually(id: string) {
    const user = await this.getOrThrow(id);
    if (user.emailVerified)
      return { id, emailVerified: true, message: 'Tài khoản đã được xác thực' };

    await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    });
    return { id, emailVerified: true };
  }

  /** Reset mật khẩu hộ user: sinh mật khẩu ngẫu nhiên, gửi email, thu hồi phiên. */
  async resetPassword(id: string) {
    const user = await this.getOrThrow(id);
    if (!user.passwordHash)
      throw new ForbiddenException(
        'Tài khoản đăng nhập bằng Google, không có mật khẩu để đặt lại',
      );

    const tempPassword = this.generatePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    // Đổi mật khẩu → thu hồi mọi phiên cũ để buộc đăng nhập lại.
    await this.refreshStore.removeAll(id);
    await this.mail.sendTempPassword(user.email, user.name, tempPassword);
    return { id, message: 'Đã gửi mật khẩu mới tới email người dùng' };
  }

  // Mật khẩu tạm 12 ký tự, dễ đọc (bỏ ký tự dễ nhầm), đủ mạnh để dùng tạm.
  private generatePassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(12);
    let out = '';
    for (let i = 0; i < 12; i += 1) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }
}
