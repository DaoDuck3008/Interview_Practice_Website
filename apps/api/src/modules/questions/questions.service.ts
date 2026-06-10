import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { QueryAdminQuestionDto } from './dto/query-admin-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryQuestionDto) {
    const where: Prisma.QuestionWhereInput = {
      isActive: true,
      ...(query.topicId && { topicId: query.topicId }),
      ...(query.level && { level: query.level }),
      ...(query.search && {
        content: { contains: query.search, mode: 'insensitive' },
      }),
    };

    if (query.page !== undefined || query.limit !== undefined) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 30;
      const [items, total] = await this.prisma.$transaction([
        this.prisma.question.findMany({
          where,
          include: { topic: true },
          orderBy: [{ topic: { name: 'asc' } }, { level: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.question.count({ where }),
      ]);
      return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
    }

    return this.prisma.question.findMany({
      where,
      include: { topic: true },
    });
  }

  async findRandom(query: QueryQuestionDto) {
    const count = await this.prisma.question.count({
      where: {
        isActive: true,
        ...(query.topicId && { topicId: query.topicId }),
        ...(query.level && { level: query.level }),
      },
    });
    const skip = Math.floor(Math.random() * count);
    const results = await this.prisma.question.findMany({
      where: {
        isActive: true,
        ...(query.topicId && { topicId: query.topicId }),
        ...(query.level && { level: query.level }),
      },
      include: { topic: true },
      take: 1,
      skip,
    });
    return results[0] ?? null;
  }

  async findAllAdmin(query: QueryAdminQuestionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;

    const where: Prisma.QuestionWhereInput = {
      ...(query.topicId && { topicId: query.topicId }),
      ...(query.level && { level: query.level }),
      ...(query.status === 'active' && { isActive: true }),
      ...(query.status === 'hidden' && { isActive: false }),
      ...(query.search && {
        content: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const order = query.order ?? 'asc';
    let orderBy:
      | Prisma.QuestionOrderByWithRelationInput
      | Prisma.QuestionOrderByWithRelationInput[];
    switch (query.sortBy) {
      case 'content':
        orderBy = { content: order };
        break;
      case 'level':
        orderBy = { level: order };
        break;
      case 'status':
        orderBy = { isActive: order };
        break;
      case 'topic':
      default:
        orderBy = [{ topic: { name: order } }, { level: 'asc' }];
        break;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: { topic: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async countByTopic() {
    const groups = await this.prisma.question.groupBy({
      by: ['topicId'],
      _count: { _all: true },
    });
    return groups.map((g) => ({ topicId: g.topicId, count: g._count._all }));
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi');
    return question;
  }

  create(dto: CreateQuestionDto) {
    return this.prisma.question.create({ data: dto });
  }

  update(id: string, data: UpdateQuestionDto) {
    return this.prisma.question.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
