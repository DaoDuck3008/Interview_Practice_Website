import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  /** Lịch sử hội thoại của 1 user (cả tin user gửi lẫn admin trả lời), cũ -> mới. */
  getThread(userId: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Admin: danh sách hội thoại — 1 dòng / user, kèm tin nhắn mới nhất. */
  async getThreads() {
    const latest = await this.prisma.supportMessage.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
    });
    if (latest.length === 0) return [];

    return this.prisma.supportMessage.findMany({
      where: {
        OR: latest.map((l) => ({
          userId: l.userId,
          createdAt: l._max.createdAt!,
        })),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createMessage(userId: string, senderRole: Role, content: string) {
    return this.prisma.supportMessage.create({
      data: { userId, senderRole, content },
    });
  }
}
