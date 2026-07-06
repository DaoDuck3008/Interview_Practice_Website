import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../cache/cache.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { QueryCursorQuestionDto } from './dto/query-cursor-question.dto';
import { QueryAdminQuestionDto } from './dto/query-admin-question.dto';

const ORDER_TTL = 300; // 5 phút — danh sách id/level cho nút prev/next, đổi khi admin CRUD câu hỏi
const STATS_TTL = 60; // 1 phút — thẻ thống kê admin, chấp nhận trễ vài chục giây

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private orderCacheKey(topicId: string) {
    return `questions:order:${topicId}`;
  }

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
          orderBy: [{ isFeatured: 'desc' }, { level: 'asc' }, { id: 'asc' }],
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

    return this.prisma.question.findMany({
      where,
      include: { topic: true },
      orderBy: [{ isFeatured: 'desc' }, { level: 'asc' }, { id: 'asc' }],
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
    return this.cache.getOrSet('questions:topic-counts', STATS_TTL, async () => {
      const groups = await this.prisma.question.groupBy({
        by: ['topicId'],
        _count: { _all: true },
      });
      return groups.map((g) => ({ topicId: g.topicId, count: g._count._all }));
    });
  }

  /** Admin: top N câu hỏi được ghi âm (Session) nhiều nhất, mới nhiều nhất trước. */
  async getTopRecorded(limit = 10) {
    return this.cache.getOrSet(
      `questions:top-recorded:${limit}`,
      STATS_TTL,
      async () => {
        const groups = await this.prisma.session.groupBy({
          by: ['questionId'],
          _count: { questionId: true },
          orderBy: { _count: { questionId: 'desc' } },
          take: limit,
        });
        if (groups.length === 0) return [];

        const questions = await this.prisma.question.findMany({
          where: { id: { in: groups.map((g) => g.questionId) } },
          select: {
            id: true,
            content: true,
            level: true,
            topic: { select: { name: true, slug: true } },
          },
        });
        const byId = new Map(questions.map((q) => [q.id, q]));

        return groups
          .map((g) => {
            const q = byId.get(g.questionId);
            return q ? { ...q, sessionCount: g._count.questionId } : null;
          })
          .filter((q): q is NonNullable<typeof q> => q !== null);
      },
    );
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi');
    return question;
  }

  // Public: chỉ trả về câu hỏi đang active (dùng cho trang practice)
  async findOnePublic(id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, isActive: true },
      include: { topic: true },
    });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi');
    return question;
  }

  // Public: danh sách id + level đã sắp xếp của 1 topic (cho nút prev/next + bộ đếm ở trang practice (PracticeNavFooter.tsx))
  findOrder(topicId: string | undefined) {
    if (!topicId)
      throw new BadRequestException('TopicID không được truyền vào');
    return this.cache.getOrSet(
      this.orderCacheKey(topicId),
      ORDER_TTL,
      () =>
        this.prisma.question.findMany({
          where: { isActive: true, topicId },
          select: { id: true, level: true },
          orderBy: [{ isFeatured: 'desc' }, { level: 'asc' }, { id: 'asc' }],
        }),
    );
  }

  // Public: cursor pagination cho sidebar (Xem thêm / cuộn vô hạn)
  async findByCursor(query: QueryCursorQuestionDto) {
    if (!query.topicId)
      throw new BadRequestException('TopicID không được truyền vào');
    const limit = query.limit ?? 15;

    const where: Prisma.QuestionWhereInput = {
      isActive: true,
      topicId: query.topicId,
      ...(query.level && { level: query.level }),
    };

    // Phải lấy dư 1 phần tử để biết còn trang sau hay không
    const rows = await this.prisma.question.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { level: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(query.cursor && { skip: 1, cursor: { id: query.cursor } }),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  async create(dto: CreateQuestionDto) {
    const question = await this.prisma.question.create({ data: dto });
    await this.cache.del(this.orderCacheKey(question.topicId));
    return question;
  }

  async update(id: string, data: UpdateQuestionDto) {
    const before = await this.prisma.question.findUnique({
      where: { id },
      select: { topicId: true },
    });
    const question = await this.prisma.question.update({ where: { id }, data });

    const keys = [this.orderCacheKey(question.topicId)];
    if (before && before.topicId !== question.topicId) {
      keys.push(this.orderCacheKey(before.topicId));
    }
    await this.cache.del(...keys);
    return question;
  }

  async softDelete(id: string) {
    const question = await this.prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
    await this.cache.del(this.orderCacheKey(question.topicId));
    return question;
  }
}
