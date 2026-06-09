import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  findAll(query: QueryQuestionDto) {
    return this.prisma.question.findMany({
      where: {
        isActive: true,
        ...(query.topicId && { topicId: query.topicId }),
        ...(query.level && { level: query.level }),
      },
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

  findAllAdmin() {
    return this.prisma.question.findMany({
      include: { topic: true },
      orderBy: [{ topicId: 'asc' }, { level: 'asc' }],
    });
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
