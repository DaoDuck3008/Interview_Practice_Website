import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryUserDto } from './dto/query-user.dto';

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
  constructor(private prisma: PrismaService) {}

  // Trả về bản ghi đầy đủ (kèm passwordHash) — chỉ dùng nội bộ để xác thực/liên kết
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicSelect,
    });
  }

  async create(data: { name: string; email: string; passwordHash: string }) {
    const exists = await this.findByEmail(data.email);
    if (exists) throw new ConflictException('Email đã được sử dụng');
    return this.prisma.user.create({
      data,
      select: publicSelect,
    });
  }

  /** Danh sách user cho admin — phân trang + tìm theo tên/email, kèm tóm tắt gói hiện tại. */
  async findAllAdmin(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;

    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              expiresAt: true,
              plan: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
}
