import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  findActive() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        priceVnd: true,
        durationDays: true,
      },
    });
  }

  findAllAdmin() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { subscriptions: true, orders: true } },
      },
    });
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Slug gói đã tồn tại');

    return this.prisma.plan.create({
      data: this.toData(dto) as Prisma.PlanUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Không tìm thấy gói');

    if (dto.slug && dto.slug !== plan.slug) {
      const dup = await this.prisma.plan.findUnique({
        where: { slug: dto.slug },
      });
      if (dup) throw new ConflictException('Slug gói đã tồn tại');
    }

    return this.prisma.plan.update({ where: { id }, data: this.toData(dto) });
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true, orders: true } },
      },
    });
    if (!plan) throw new NotFoundException('Không tìm thấy gói');

    if (plan._count.subscriptions > 0 || plan._count.orders > 0) {
      throw new ConflictException(
        'Không thể xóa gói đã được sử dụng trong subscription hoặc đơn hàng',
      );
    }

    await this.prisma.plan.delete({ where: { id } });
    return { id };
  }

  private toData(
    dto: CreatePlanDto | UpdatePlanDto,
  ): Prisma.PlanUncheckedUpdateInput {
    return {
      slug: dto.slug,
      name: dto.name,
      description: dto.description,
      priceVnd: dto.priceVnd,
      durationDays: dto.durationDays,
      isUnlimited: dto.isUnlimited,
      dailyScoreLimit: dto.dailyScoreLimit,
      weeklyScoreLimit: dto.weeklyScoreLimit,
      limits: dto.limits as Prisma.InputJsonValue | undefined,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    };
  }
}
