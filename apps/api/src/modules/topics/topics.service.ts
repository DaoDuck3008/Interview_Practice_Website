import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.topic.findMany({ orderBy: { name: 'asc' } });
  }

  create(data: { slug: string; name: string }) {
    return this.prisma.topic.create({ data });
  }

  update(id: string, data: UpdateTopicDto) {
    return this.prisma.topic.update({ where: { id }, data });
  }

  async remove(id: string) {
    const count = await this.prisma.question.count({ where: { topicId: id } });
    if (count > 0) {
      throw new ConflictException(
        'Chủ đề còn câu hỏi, không thể xóa. Hãy xóa hoặc chuyển các câu hỏi trước.',
      );
    }
    return this.prisma.topic.delete({ where: { id } });
  }
}
