import { Injectable } from '@nestjs/common';
import { Level } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { selectDistributedQuestionIds } from '../../../common/utils/question-selection.util';
import { splitBalancedLevelCounts } from '../../mock-cv-analysis/mock-cv-bank-question.utils';

const LEVEL_ORDER: Record<Level, number> = {
  [Level.EASY]: 0,
  [Level.MEDIUM]: 1,
  [Level.HARD]: 2,
};

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
        ...(await this.findDistributedQuestionIds(
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
    const selected = selectedIds.flatMap((id) => {
      const question = byId.get(id);
      return question ? [question] : [];
    });
    // Cả câu fallback cũng phải về đúng vị trí để phần lý thuyết luôn tăng dần độ khó.
    return selected.sort(
      (left, right) => LEVEL_ORDER[left.level] - LEVEL_ORDER[right.level],
    );
  }

  private async findDistributedQuestionIds(
    topicIds: string[],
    level: Level | undefined,
    take: number,
    excludedIds: string[],
  ): Promise<string[]> {
    if (take <= 0 || topicIds.length === 0) return [];
    // Chỉ query một lần cho mỗi level, sau đó chia quota theo topic trong memory.
    const candidates = await this.prisma.question.findMany({
      where: {
        isActive: true,
        topicId: { in: topicIds },
        ...(level ? { level } : {}),
        ...(excludedIds.length > 0
          ? { id: { notIn: excludedIds } }
          : {}),
      },
      select: { id: true, topicId: true },
    });
    return selectDistributedQuestionIds(candidates, topicIds, take);
  }
}
