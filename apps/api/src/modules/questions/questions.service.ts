import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
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

  create(dto: CreateQuestionDto) {
    return this.prisma.question.create({ data: dto });
  }

  update(id: string, data: Partial<CreateQuestionDto>) {
    return this.prisma.question.update({ where: { id }, data });
  }
}
