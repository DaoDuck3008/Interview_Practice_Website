import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { QueryAdminTopicDto } from './dto/query-admin-topic.dto';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findAll() {
    const rows = await this.prisma.topic.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { questions: true } } },
    });
    return rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      iconUrl: t.iconUrl ?? null,
      parentId: t.parentId ?? null,
      questionCount: t._count.questions,
    }));
  }

  async findAllAdmin(query: QueryAdminTopicDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;

    const where: Prisma.TopicWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const order = query.order ?? 'asc';
    let orderBy: Prisma.TopicOrderByWithRelationInput;
    switch (query.sortBy) {
      case 'slug':
        orderBy = { slug: order };
        break;
      case 'questions':
        orderBy = { questions: { _count: order } };
        break;
      case 'name':
      default:
        orderBy = { name: order };
        break;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where,
        orderBy,
        include: {
          _count: { select: { questions: true } },
          parent: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where }),
    ]);

    const items = rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      iconUrl: t.iconUrl ?? null,
      parentId: t.parentId ?? null,
      parentName: t.parent?.name ?? null,
      questionCount: t._count.questions,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  create(data: CreateTopicDto) {
    return this.prisma.topic.create({ data });
  }

  update(id: string, data: UpdateTopicDto) {
    return this.prisma.topic.update({ where: { id }, data });
  }

  async uploadIcon(id: string, file: Express.Multer.File): Promise<{ iconUrl: string }> {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Topic không tồn tại.');

    if (topic.iconUrl) {
      await this.storage.delete(this.storage.keyFromUrl(topic.iconUrl));
    }

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const key = `images/topics/${id}/${randomUUID()}${ext}`;
    const iconUrl = await this.storage.upload(key, file.buffer, file.mimetype);

    await this.prisma.topic.update({ where: { id }, data: { iconUrl } });
    return { iconUrl };
  }

  async remove(id: string) {
    const [questionCount, childrenCount] = await Promise.all([
      this.prisma.question.count({ where: { topicId: id } }),
      this.prisma.topic.count({ where: { parentId: id } }),
    ]);

    if (questionCount > 0) {
      throw new ConflictException(
        'Chủ đề còn câu hỏi, không thể xóa. Hãy xóa hoặc chuyển các câu hỏi trước.',
      );
    }
    if (childrenCount > 0) {
      throw new ConflictException(
        'Chủ đề cha còn topic con, không thể xóa. Hãy xóa các topic con trước.',
      );
    }

    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (topic?.iconUrl) {
      await this.storage.delete(this.storage.keyFromUrl(topic.iconUrl));
    }

    return this.prisma.topic.delete({ where: { id } });
  }
}
