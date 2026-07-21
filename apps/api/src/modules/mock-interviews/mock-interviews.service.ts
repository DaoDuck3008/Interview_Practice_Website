import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionAnswerStatus,
  MockQuestionScoreStatus,
  Level,
  Prisma,
} from '@prisma/client';
import { Redis } from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SpeechService } from '../speech/speech.service';
import { QuotaService } from '../quota/quota.service';
import { AiJobsService } from '../ai-jobs/ai-jobs.service';
import { CacheService } from '../../cache/cache.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { MAX_AUDIO_DURATION_SEC } from '../../common/upload/audio.constants';
import {
  CreateMockInterviewDto,
  type MockInterviewLevelOption,
} from './dto/create-mock-interview.dto';
import { QueryMockInterviewDto } from './dto/query-mock-interview.dto';

const ANSWER_LOCK_TTL_SEC = 300;
const ANSWER_GRACE_MS = 10_000;

const DETAIL_INCLUDE = {
  topic: { select: { id: true, name: true, slug: true } },
  questions: {
    orderBy: { order: 'asc' as const },
    include: {
      question: {
        select: {
          id: true,
          content: true,
          level: true,
          topic: { select: { id: true, name: true, slug: true } },
        },
      },
      session: {
        select: {
          id: true,
          audioUrl: true,
          transcript: true,
          duration: true,
          createdAt: true,
          score: true,
        },
      },
    },
  },
};

@Injectable()
export class MockInterviewsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private speech: SpeechService,
    private quota: QuotaService,
    private aiJobs: AiJobsService,
    private cache: CacheService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  // Tạo mock interview mới, chọn ngẫu nhiên câu hỏi từ topic và level.
  async create(userId: string, dto: CreateMockInterviewDto) {
    // Kiểm tra quota trước khi tạo mock interview
    await this.quota.assertWithinLimitFor(userId, dto.totalQuestions);

    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
      select: { id: true, name: true, slug: true },
    });
    if (!topic) throw new NotFoundException('Topic không tồn tại.');

    // Random ngay trong DB để không kéo toàn bộ id câu hỏi về memory Node.js.
    const selected = await this.findRandomQuestionsForLevelOption(
      dto.topicId,
      dto.level,
      dto.totalQuestions,
    );
    if (selected.length < dto.totalQuestions) {
      throw new BadRequestException(
        `Chủ đề này chỉ có ${selected.length} câu hỏi phù hợp, chưa đủ ${dto.totalQuestions} câu.`,
      );
    }

    const title = `Mock interview ${topic.name}${dto.level ? ` - ${dto.level}` : ''}`;

    return this.prisma.mockInterview.create({
      data: {
        userId,
        title,
        topicId: dto.topicId,
        level: dto.level === 'MIX' ? null : dto.level,
        totalQuestions: dto.totalQuestions,
        durationSeconds: dto.durationSeconds,
        questions: {
          create: selected.map((q, index) => ({
            questionId: q.id,
            order: index + 1,
          })),
        },
      },
      include: DETAIL_INCLUDE,
    });
  }

  async findAll(userId: string, query: QueryMockInterviewDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = { userId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mockInterview.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          level: true,
          totalQuestions: true,
          durationSeconds: true,
          startedAt: true,
          expiresAt: true,
          submittedAt: true,
          scoredAt: true,
          overallScore: true,
          createdAt: true,
          topic: { select: { id: true, name: true, slug: true } },
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mockInterview.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // Hàm kiểm tra quyền sở hữu và trả về mock interview chi tiết
  // Dùng trong các hàm start(), answer(), submit(), getResult().
  async getOwned(id: string, userId: string) {
    const mock = await this.prisma.mockInterview.findFirst({
      where: { id, userId },
      include: DETAIL_INCLUDE,
    });
    if (!mock) throw new NotFoundException('Mock interview không tồn tại.');
    return mock;
  }

  // Bắt đầu mock interview, set status = IN_PROGRESS và tính expiresAt.
  async start(id: string, userId: string) {
    const mock = await this.prisma.mockInterview.findFirst({
      where: { id, userId },
    });
    if (!mock) throw new NotFoundException('Mock interview không tồn tại.');

    // Nếu đã bắt đầu hoặc đã nộp bài, trả về luôn mock interview chi tiết.
    if (mock.status === MockInterviewStatus.IN_PROGRESS) {
      return this.getOwned(id, userId);
    }
    if (mock.status !== MockInterviewStatus.DRAFT) {
      throw new ConflictException('Mock interview này không thể bắt đầu lại.');
    }

    // Kiểm tra quota trước khi bắt đầu mock interview
    await this.quota.assertWithinLimitFor(userId, mock.totalQuestions);

    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + mock.durationSeconds * 1000,
    );

    // Cập nhật status thành IN_PROGRESS và thời gian bắt đầu/kết thúc
    await this.prisma.mockInterview.update({
      where: { id },
      data: {
        status: MockInterviewStatus.IN_PROGRESS,
        startedAt,
        expiresAt,
      },
    });

    return this.getOwned(id, userId);
  }

  // Trả lời 1 câu hỏi trong mock interview, chỉ upload  audio và transcript, chưa chấm điểm.
  async answer(
    id: string,
    questionItemId: string,
    userId: string,
    file: Express.Multer.File,
    duration: number,
  ) {
    if (!file) {
      throw new BadRequestException('Không có file audio được gửi lên.');
    }

    const item = await this.prisma.mockInterviewQuestion.findFirst({
      where: {
        id: questionItemId,
        mockInterview: { id, userId },
      },
      include: { mockInterview: true, question: true },
    });
    if (!item) throw new NotFoundException('Câu hỏi trong mock không tồn tại.');

    // Kiểm tra quyền sở hữu và trạng thái mock interview trước khi trả lời
    this.assertCanAnswer(item.mockInterview);
    if (
      item.sessionId ||
      item.answerStatus === MockQuestionAnswerStatus.ANSWERED
    ) {
      throw new ConflictException('Câu này đã được trả lời.');
    }

    // Dùng Redis lock để tránh user gửi nhiều request answer cùng lúc cho 1 câu hỏi.
    const lockKey = `lock:mock-answer:${questionItemId}`;
    const lockValue = randomUUID();
    const locked = await this.redis.set(
      lockKey,
      lockValue,
      'EX',
      ANSWER_LOCK_TTL_SEC,
      'NX',
    );
    if (locked !== 'OK') {
      throw new ConflictException('Câu này đang được xử lý, vui lòng chờ.');
    }

    // Upload audio lên storage.
    let audioUrl: string | undefined;
    try {
      await this.quota.assertWithinLimit(userId);

      const { transcript, duration: measuredDuration } =
        await this.speech.transcribe(file);
      if (
        measuredDuration !== null &&
        measuredDuration > MAX_AUDIO_DURATION_SEC
      ) {
        throw new BadRequestException('Audio không được vượt quá 4 phút.');
      }

      const key = `sessions/${userId}/${randomUUID()}.webm`;
      audioUrl = await this.storage.uploadStream(
        key,
        file.buffer,
        file.mimetype,
      );

      const session = await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.mockInterviewQuestion.findFirst({
          where: {
            id: questionItemId,
            mockInterview: { id, userId },
          },
          include: { mockInterview: true },
        });
        if (!fresh) {
          throw new NotFoundException('Câu hỏi trong mock không tồn tại.');
        }
        this.assertCanAnswer(fresh.mockInterview);
        if (fresh.sessionId) {
          throw new ConflictException('Câu này đã được trả lời.');
        }

        const created = await tx.session.create({
          data: {
            userId,
            questionId: item.questionId,
            audioUrl: audioUrl!,
            transcript,
            duration: measuredDuration ?? duration,
          },
        });

        await tx.mockInterviewQuestion.update({
          where: { id: questionItemId },
          data: {
            sessionId: created.id,
            answerStatus: MockQuestionAnswerStatus.ANSWERED,
            answeredAt: new Date(),
          },
        });

        return created;
      });

      await this.quota.record(userId, session.id);
      await this.cache.del(
        `sessions:me:stats:${userId}`,
        `sessions:me:heatmap:${userId}`,
      );

      return {
        id: session.id,
        questionId: session.questionId,
        audioUrl: session.audioUrl,
        transcript: session.transcript,
        duration: session.duration,
        createdAt: session.createdAt,
      };
    } catch (err) {
      if (audioUrl)
        await this.storage.delete(this.storage.keyFromUrl(audioUrl));
      throw err;
    } finally {
      // Xóa lock Redis để user có thể gửi request answer tiếp theo cho câu hỏi này.
      await this.releaseLock(lockKey, lockValue);
    }
  }

  // Nộp bài mock interview, set status = SCORING và enqueue các câu đã trả lời để chấm điểm.
  async submit(id: string, userId: string) {
    const mock = await this.prisma.mockInterview.findFirst({
      where: { id, userId },
      include: { questions: true },
    });
    if (!mock) throw new NotFoundException('Mock interview không tồn tại.');

    if (
      mock.status === MockInterviewStatus.SUBMITTED ||
      mock.status === MockInterviewStatus.SCORING ||
      mock.status === MockInterviewStatus.SCORED
    ) {
      return this.getOwned(id, userId);
    }
    if (mock.status !== MockInterviewStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Mock interview này chưa ở trạng thái làm bài.',
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.mockInterviewQuestion.updateMany({
        where: { mockInterviewId: id, sessionId: null },
        data: {
          answerStatus: MockQuestionAnswerStatus.SKIPPED,
          scoreStatus: MockQuestionScoreStatus.SKIPPED,
          skippedAt: now,
        },
      }),
      this.prisma.mockInterview.update({
        where: { id },
        data: {
          status: MockInterviewStatus.SCORING,
          submittedAt: now,
        },
      }),
    ]);

    const answered = await this.prisma.mockInterviewQuestion.findMany({
      where: { mockInterviewId: id, sessionId: { not: null } },
      select: { id: true, sessionId: true },
    });

    if (answered.length === 0) {
      await this.prisma.mockInterview.update({
        where: { id },
        data: {
          status: MockInterviewStatus.SCORED,
          scoredAt: new Date(),
          overviewStatus: MockOverviewStatus.FALLBACK,
          summary: 'Bạn chưa trả lời câu nào trong mock interview này.',
          strengths: [],
          weaknesses: ['Chưa có câu trả lời nào để đánh giá.'],
          nextRecommendations: [
            'Hãy thử lại với thời lượng ngắn hơn hoặc ít câu hơn.',
          ],
        },
      });
      return this.getOwned(id, userId);
    }

    await this.prisma.mockInterviewQuestion.updateMany({
      where: {
        id: { in: answered.map((q) => q.id) },
        scoreStatus: MockQuestionScoreStatus.PENDING,
      },
      data: { scoreStatus: MockQuestionScoreStatus.QUEUED, scoreError: null },
    });

    await Promise.all(
      answered
        .filter((q): q is { id: string; sessionId: string } => !!q.sessionId)
        .map((q) => this.aiJobs.enqueueScore(q.sessionId, userId)),
    );

    return this.getOwned(id, userId);
  }

  // Hàm lấy kết quả mock interview, chỉ trả về mock interview chi tiết nếu user là owner.
  getResult(id: string, userId: string) {
    return this.getOwned(id, userId);
  }

  // Hàm kiểm tra quyền sở hữu và trạng thái mock interview trước khi trả lời câu hỏi.
  // Dùng trong hàm answer().
  private assertCanAnswer(mock: {
    status: MockInterviewStatus;
    expiresAt: Date | null;
  }) {
    if (mock.status !== MockInterviewStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Mock interview chưa bắt đầu hoặc đã kết thúc.',
      );
    }
    if (!mock.expiresAt) {
      throw new ConflictException('Mock interview chưa có thời gian kết thúc.');
    }
    if (Date.now() > mock.expiresAt.getTime() + ANSWER_GRACE_MS) {
      throw new ConflictException('Đã hết thời gian, vui lòng nộp bài.');
    }
  }

  // Lấy danh sách câu hỏi ngẫu nhiên từ topic và level, giới hạn số lượng bằng `take`.
  // Dùng trong hàm create().
  private async findRandomQuestionsForLevelOption(
    topicId: string,
    level: MockInterviewLevelOption | undefined,
    take: number,
  ) {
    if (level !== 'MIX') {
      return this.findRandomQuestionIds(topicId, level, take);
    }

    const split = splitMixedLevelCounts(take);
    const [easy, medium, hard] = await Promise.all([
      this.findRandomQuestionIds(topicId, Level.EASY, split.easy),
      this.findRandomQuestionIds(topicId, Level.MEDIUM, split.medium),
      this.findRandomQuestionIds(topicId, Level.HARD, split.hard),
    ]);

    return [...easy, ...medium, ...hard];
  }

  // Hàm lấy danh sách câu hỏi ngẫu nhiên từ topic và level, giới hạn số lượng bằng `take`.
  private findRandomQuestionIds(
    topicId: string,
    level: Level | undefined,
    take: number,
  ) {
    if (take <= 0) return Promise.resolve([]);
    const levelFilter = level
      ? Prisma.sql`AND "level" = ${level}::"Level"`
      : Prisma.empty;

    return this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT "id"
      FROM "Question"
      WHERE "isActive" = true
        AND "topicId" = ${topicId}
        ${levelFilter}
      ORDER BY random()
      LIMIT ${take}
    `);
  }

  private async releaseLock(key: string, value: string) {
    await this.redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      key,
      value,
    );
  }
}

// Util function để chia số lượng câu hỏi khi level = MIX thành EASY, MEDIUM, HARD.
// Nếu totalQuestions không chia hết cho 3 thì ưu tiên EASY > MEDIUM > HARD.
// Dùng trong hàm findRandomQuestionsForLevelOption().
function splitMixedLevelCounts(totalQuestions: number) {
  const base = Math.floor(totalQuestions / 3);
  const remainder = totalQuestions % 3;
  return {
    easy: base + (remainder >= 1 ? 1 : 0),
    medium: base + (remainder >= 2 ? 1 : 0),
    hard: base,
  };
}
