import { Injectable } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  splitBalancedLevelCounts,
  splitEvenly,
} from '../../mock-cv-analysis/mock-cv-bank-question.utils';

/** Chọn câu bank cân bằng theo level và topic; AI sẽ bù nếu bank không đủ. */
@Injectable()
export class MockCvQuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  async select(
    topics: Array<{ id: string; name: string }>,
    bankTarget: number,
    seed: string,
  ) {
    if (bankTarget === 0 || topics.length === 0) return [];

    const topicIds = topics.map((topic) => topic.id);
    const quotas = splitBalancedLevelCounts(bankTarget, seed);
    const selectedIds: string[] = [];
    for (const level of [Level.EASY, Level.MEDIUM, Level.HARD]) {
      const ids = await this.findDistributedQuestionIds(
        topicIds,
        level,
        quotas[level],
        selectedIds,
      );
      selectedIds.push(...ids);
    }

    // Nếu một level thiếu dữ liệu, bù từ level còn lại trong đúng các topic của CV.
    if (selectedIds.length < bankTarget) {
      selectedIds.push(
        ...(await this.findRandomQuestionIds(
          topicIds,
          undefined,
          bankTarget - selectedIds.length,
          selectedIds,
        )),
      );
    }

    const rows = await this.prisma.question.findMany({
      where: { id: { in: selectedIds } },
      select: {
        id: true,
        content: true,
        answerKeySummary: true,
        answerKeywords: true,
        level: true,
        topic: { select: { name: true } },
      },
    });
    const byId = new Map(rows.map((question) => [question.id, question]));
    return selectedIds.flatMap((id) => {
      const question = byId.get(id);
      return question ? [question] : [];
    });
  }

  private async findDistributedQuestionIds(
    topicIds: string[],
    level: Level,
    take: number,
    excludedIds: string[],
  ): Promise<string[]> {
    if (take <= 0 || topicIds.length === 0) return [];
    const perTopic = splitEvenly(take, topicIds.length);
    const selected = [...excludedIds];
    const result: string[] = [];
    for (const [index, topicId] of topicIds.entries()) {
      const ids = await this.findRandomQuestionIds(
        [topicId],
        level,
        perTopic[index],
        selected,
      );
      result.push(...ids);
      selected.push(...ids);
    }
    if (result.length < take) {
      result.push(
        ...(await this.findRandomQuestionIds(
          topicIds,
          level,
          take - result.length,
          selected,
        )),
      );
    }
    return result;
  }

  private async findRandomQuestionIds(
    topicIds: string[],
    level: Level | undefined,
    take: number,
    excludedIds: string[],
  ): Promise<string[]> {
    if (take <= 0 || topicIds.length === 0) return [];
    const levelFilter = level
      ? Prisma.sql`AND "level" = ${level}::"Level"`
      : Prisma.empty;
    const exclusionFilter = excludedIds.length
      ? Prisma.sql`AND "id" NOT IN (${Prisma.join(excludedIds)})`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Question"
      WHERE "isActive" = true
        AND "topicId" IN (${Prisma.join(topicIds)})
        ${levelFilter}
        ${exclusionFilter}
      ORDER BY random()
      LIMIT ${take}
    `);
    return rows.map((row) => row.id);
  }
}
