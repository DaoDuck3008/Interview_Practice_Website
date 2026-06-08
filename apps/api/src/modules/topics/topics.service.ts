import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.topic.findMany({ orderBy: { name: 'asc' } });
  }

  create(data: { slug: string; name: string }) {
    return this.prisma.topic.create({ data });
  }
}
