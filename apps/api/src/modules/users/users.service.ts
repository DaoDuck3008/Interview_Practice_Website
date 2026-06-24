import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}
