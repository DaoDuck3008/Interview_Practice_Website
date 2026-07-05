import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryFavoriteDto } from './dto/query-favorite.dto';

const QUESTION_SELECT = {
  id: true,
  topicId: true,
  content: true,
  detailAnswerKey: true,
  answerKeySummary: true,
  answerKeywords: true,
  level: true,
  isActive: true,
  isFeatured: true,
  topic: { select: { id: true, slug: true, name: true } },
};

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  /** Toàn bộ questionId đã lưu của user — dùng để tô trạng thái nút bookmark. */
  async getIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { questionId: true },
    });
    return favorites.map((f) => f.questionId);
  }

  /** N câu hỏi lưu gần nhất, mới nhất trước — hiển thị trong drawer ở Header. */
  async getRecent(userId: string, limit = 8) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { createdAt: true, question: { select: QUESTION_SELECT } },
    });
    return favorites.map((f) => ({
      ...f.question,
      favoritedAt: f.createdAt,
    }));
  }

  /** Danh sách đầy đủ, phân trang (trang /saved). */
  async getPaginated(userId: string, query: QueryFavoriteDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = { userId };

    const [favorites, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { createdAt: true, question: { select: QUESTION_SELECT } },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      items: favorites.map((f) => ({ ...f.question, favoritedAt: f.createdAt })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** Lưu câu hỏi — idempotent, đã lưu rồi thì trả về luôn, không lỗi. */
  async add(userId: string, questionId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    if (existing) return { favorited: true };

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    await this.prisma.favorite.create({ data: { userId, questionId } });
    return { favorited: true };
  }

  /** Bỏ lưu — idempotent, chưa từng lưu thì cũng không lỗi. */
  async remove(userId: string, questionId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, questionId } });
    return { favorited: false };
  }
}
