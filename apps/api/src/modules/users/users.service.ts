import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async create(data: { name: string; email: string; passwordHash: string }) {
    const exists = await this.findByEmail(data.email);
    if (exists) throw new ConflictException('Email đã được sử dụng');
    return this.prisma.user.create({
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }
}
