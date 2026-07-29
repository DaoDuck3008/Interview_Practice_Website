import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MockInterviewStatus,
  MockInterviewMode,
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
import { lockAdvisoryKey } from '../../common/utils/billing-lock.util';
import {
  CreateMockInterviewDto,
  type MockInterviewLevelOption,
} from './dto/create-mock-interview.dto';
import { QueryMockInterviewDto } from './dto/query-mock-interview.dto';
import { MockInterviewJobsService } from './mock-interview-jobs.service';
import {
  MOCK_ANSWER_GRACE_MS,
  MOCK_AUTO_SUBMIT_BUFFER_MS,
  MOCK_EXPIRED_RECOVERY_BATCH_SIZE,
  MOCK_SCORING_STALE_MS,
} from './mock-interview.constants';

const ANSWER_LOCK_TTL_SEC = 300;

const DETAIL_INCLUDE = {
  topic: { select: { id: true, name: true, slug: true, iconUrl: true } },
  topicLinks: {
    orderBy: { order: 'asc' as const },
    select: {
      order: true,
      topic: { select: { id: true, name: true, slug: true, iconUrl: true } },
    },
  },
  questions: {
    orderBy: { order: 'asc' as const },
    include: {
      question: {
        select: {
          id: true,
          content: true,
          level: true,
          topic: { select: { id: true, name: true, slug: true, iconUrl: true } },
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
  private readonly logger = new Logger(MockInterviewsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private speech: SpeechService,
    private quota: QuotaService,
    private aiJobs: AiJobsService,
    private cache: CacheService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private mockInterviewJobs: MockInterviewJobsService,
  ) {}

  // Tạo mock interview nhiều chủ đề, chia câu hỏi gần đều giữa các chủ đề đã chọn.
  async create(userId: string, dto: CreateMockInterviewDto) {
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: dto.topicIds } },
      select: { id: true, name: true, slug: true, iconUrl: true },
    });
    if (topics.length !== dto.topicIds.length) {
      throw new NotFoundException('Có chủ đề không tồn tại.');
    }
    const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
    const orderedTopics = dto.topicIds.map(
      (topicId) => topicsById.get(topicId)!,
    );

    // Random ngay trong DB để không kéo toàn bộ id câu hỏi về memory Node.js.
    const selected = await this.findRandomQuestionsForLevelOption(
      dto.topicIds,
      dto.level,
      dto.totalQuestions,
    );
    if (selected.length < dto.totalQuestions) {
      throw new BadRequestException(
        `Các chủ đề đã chọn chỉ có ${selected.length} câu hỏi phù hợp, chưa đủ ${dto.totalQuestions} câu.`,
      );
    }

    const topicTitle = orderedTopics
      .slice(0, 2)
      .map((topic) => topic.name)
      .join(', ');
    const remainingTopicCount = orderedTopics.length - 2;
    const title = `Mock interview ${topicTitle}${remainingTopicCount > 0 ? ` +${remainingTopicCount}` : ''}${dto.level ? ` - ${dto.level}` : ''}`;

    const mock = await this.prisma.mockInterview.create({
      data: {
        userId,
        title,
        mode: MockInterviewMode.MIXED,
        // Giữ topic đầu làm fallback cho các phiên cũ và các màn hình chưa nâng cấp.
        topicId: dto.topicIds[0],
        level: dto.level === 'MIX' ? null : dto.level,
        totalQuestions: dto.totalQuestions,
        durationSeconds: dto.durationSeconds,
        topicLinks: {
          create: dto.topicIds.map((topicId, index) => ({
            topicId,
            order: index + 1,
          })),
        },
        questions: {
          create: shuffle(selected).map((questionId, index) => ({
            questionId,
            order: index + 1,
          })),
        },
      },
      include: DETAIL_INCLUDE,
    });
    return this.toMockResponse(mock);
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
          topic: {
            select: { id: true, name: true, slug: true, iconUrl: true },
          },
          topicLinks: {
            orderBy: { order: 'asc' },
            select: {
              order: true,
              topic: {
                select: { id: true, name: true, slug: true, iconUrl: true },
              },
            },
          },
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mockInterview.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toMockResponse(item)),
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
    return this.toMockResponse(mock);
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

    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + mock.durationSeconds * 1000,
    );

    // Chỉ request đầu tiên đổi được DRAFT -> IN_PROGRESS, tránh ghi đè startedAt khi bấm song song.
    const started = await this.prisma.mockInterview.updateMany({
      where: { id, userId, status: MockInterviewStatus.DRAFT },
      data: {
        status: MockInterviewStatus.IN_PROGRESS,
        startedAt,
        expiresAt,
      },
    });
    if (started.count === 0) {
      const current = await this.getOwned(id, userId);
      if (current.status === MockInterviewStatus.IN_PROGRESS) return current;
      throw new ConflictException('Mock interview này không thể bắt đầu lại.');
    }

    const startedMock = await this.getOwned(id, userId);
    try {
      // Tạo sau khi DRAFT -> IN_PROGRESS đã commit; recovery scheduler sẽ bù nếu Redis đang lỗi.
      await this.mockInterviewJobs.enqueueAutoSubmit(id, userId, expiresAt);
    } catch (err) {
      this.logger.error(
        `Không thể tạo delayed job tự nộp mock ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return startedMock;
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
    let reservation: Awaited<ReturnType<QuotaService['reserve']>> | undefined;
    try {
      // Redis lock bảo vệ một câu hỏi; reservation bảo vệ quota giữa nhiều câu hỏi/request cùng user.
      reservation = await this.quota.reserve(userId);

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
        // Serialize phần ghi DB với submit(); không giữ lock trong lúc gọi Whisper.
        await lockAdvisoryKey(tx, this.mockAdvisoryLockKey(id));

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

        await this.quota.consumeInTransaction(tx, reservation!.id, created.id);

        return created;
      });

      await Promise.all([
        this.quota.invalidateStatus(userId),
        this.cache.del(
          `sessions:me:stats:${userId}`,
          `sessions:me:heatmap:${userId}`,
        ),
      ]);

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
      if (reservation) await this.quota.cancel(reservation);
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
    const submitted = await this.prisma.$transaction(async (tx) => {
      // Cùng lock với transaction cuối của answer() để không skip nhầm câu vừa được ghi session.
      await lockAdvisoryKey(tx, this.mockAdvisoryLockKey(id));

      const claimed = await tx.mockInterview.updateMany({
        where: {
          id,
          userId,
          status: MockInterviewStatus.IN_PROGRESS,
        },
        data: {
          status: MockInterviewStatus.SCORING,
          submittedAt: now,
        },
      });
      if (claimed.count === 0) return false;

      await tx.mockInterviewQuestion.updateMany({
        where: { mockInterviewId: id, sessionId: null },
        data: {
          answerStatus: MockQuestionAnswerStatus.SKIPPED,
          scoreStatus: MockQuestionScoreStatus.SKIPPED,
          skippedAt: now,
        },
      });

      return true;
    });
    if (!submitted) {
      const current = await this.getOwned(id, userId);
      if (
        current.status === MockInterviewStatus.SUBMITTED ||
        current.status === MockInterviewStatus.SCORING ||
        current.status === MockInterviewStatus.SCORED
      ) {
        return current;
      }
      throw new ConflictException(
        'Mock interview này chưa ở trạng thái làm bài.',
      );
    }

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
        id: { in: answered.map((question) => question.id) },
        scoreStatus: MockQuestionScoreStatus.PENDING,
      },
      data: { scoreStatus: MockQuestionScoreStatus.QUEUED, scoreError: null },
    });

    await this.enqueueScoreJobs(
      answered.filter(
        (question): question is { id: string; sessionId: string } =>
          !!question.sessionId,
      ),
      userId,
      id,
    );

    return this.getOwned(id, userId);
  }

  // Hàm lấy kết quả mock interview, chỉ trả về mock interview chi tiết nếu user là owner.
  getResult(id: string, userId: string) {
    return this.getOwned(id, userId);
  }

  // Retry chỉ dành cho bài đã nộp nhưng chưa có kết quả do job lỗi hoặc bị kẹt; không chấm lại câu đã có điểm.
  async retryScoring(id: string, userId: string) {
    const now = new Date();
    const targets = await this.prisma.$transaction(async (tx) => {
      await lockAdvisoryKey(tx, this.mockAdvisoryLockKey(id));

      const mock = await tx.mockInterview.findFirst({
        where: { id, userId },
        select: { status: true, submittedAt: true, updatedAt: true },
      });
      if (!mock) throw new NotFoundException('Mock interview không tồn tại.');
      if (!mock.submittedAt) {
        throw new ConflictException('Mock interview này chưa được nộp.');
      }

      const isStale =
        mock.status === MockInterviewStatus.SCORING &&
        now.getTime() - mock.updatedAt.getTime() >= MOCK_SCORING_STALE_MS;
      if (
        mock.status !== MockInterviewStatus.SCORING &&
        mock.status !== MockInterviewStatus.SCORED
      ) {
        throw new ConflictException('Mock interview chưa sẵn sàng để chấm lại.');
      }

      const candidates = await tx.mockInterviewQuestion.findMany({
        where: {
          mockInterviewId: id,
          sessionId: { not: null },
          scoreStatus: {
            in: [
              MockQuestionScoreStatus.FAILED,
              MockQuestionScoreStatus.QUEUED,
            ],
          },
        },
        select: {
          id: true,
          sessionId: true,
          scoreStatus: true,
          session: { select: { score: { select: { id: true } } } },
        },
      });
      const retryable = candidates.flatMap((question) =>
        question.sessionId &&
        !question.session?.score &&
        (question.scoreStatus === MockQuestionScoreStatus.FAILED || isStale)
          ? [{ id: question.id, sessionId: question.sessionId }]
          : [],
      );
      if (retryable.length === 0) {
        throw new ConflictException(
          'Chưa có câu chấm lỗi hoặc chấm quá lâu để thực hiện lại.',
        );
      }

      await tx.mockInterviewQuestion.updateMany({
        where: { id: { in: retryable.map((question) => question.id) } },
        data: { scoreStatus: MockQuestionScoreStatus.QUEUED, scoreError: null },
      });
      await tx.mockInterview.update({
        where: { id },
        data: {
          status: MockInterviewStatus.SCORING,
          scoredAt: null,
          averageTechnicalScore: null,
          averageCompletenessScore: null,
          averageClarityScore: null,
          overallScore: null,
          summary: null,
          strengths: [],
          weaknesses: [],
          nextRecommendations: [],
          overviewStatus: MockOverviewStatus.PENDING,
          overviewError: null,
        },
      });

      return retryable;
    });

    await this.enqueueScoreJobs(targets, userId, id);
    return this.getOwned(id, userId);
  }

  private async enqueueScoreJobs(
    questions: Array<{ sessionId: string }>,
    userId: string,
    mockInterviewId: string,
  ) {
    const results = await Promise.allSettled(
      questions.map((question) =>
        this.aiJobs.enqueueScore(question.sessionId, userId),
      ),
    );
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      // Không rollback bài đã nộp: UI sẽ cho retry sau khi các câu QUEUED bị kẹt quá thời gian cho phép.
      this.logger.error(
        `Không thể enqueue ${failed.length}/${questions.length} job chấm điểm cho mock ${mockInterviewId}.`,
      );
    }
  }

  // Dùng bởi mock-interview-jobs. Service tìm mockInterview của user khi đã hết hạn để submit
  async autoSubmitExpired(id: string, userId: string) {
    const mock = await this.prisma.mockInterview.findFirst({
      where: { id, userId },
      select: { id: true, userId: true, status: true, expiresAt: true },
    });
    if (
      !mock ||
      mock.status !== MockInterviewStatus.IN_PROGRESS ||
      !mock.expiresAt
    ) {
      this.logger.debug(
        `Bỏ qua auto-submit mock ${id}: không còn ở trạng thái IN_PROGRESS.`,
      );
      return;
    }

    const autoSubmitAt =
      mock.expiresAt.getTime() +
      MOCK_ANSWER_GRACE_MS +
      MOCK_AUTO_SUBMIT_BUFFER_MS;
    // Phòng thủ nếu delayed job bị chạy sớm; job hợp lệ chỉ được chốt sau grace window.
    if (Date.now() < autoSubmitAt) {
      this.logger.debug(`Bỏ qua auto-submit mock ${id}: chưa hết grace window.`);
      return;
    }

    this.logger.log(`Bắt đầu tự nộp mock interview ${id} đã hết thời gian.`);
    await this.submit(mock.id, mock.userId);
    this.logger.log(`Đã tự nộp mock interview ${id}.`);
  }

  //Dùng bởi mock-interview-jobs. Service tìm tất cả mockInterview đã hết hạn nhưng status vẫn là IN_PROGRESS để mocck-interview-job xử lý.
  async findExpiredForAutoSubmit(): Promise<
    Array<{ id: string; userId: string; expiresAt: Date }>
  > {
    // Chỉ lấy một batch để recovery không tạo tải đột biến khi hệ thống vừa hoạt động lại.
    const mocks = await this.prisma.mockInterview.findMany({
      where: {
        status: MockInterviewStatus.IN_PROGRESS,
        expiresAt: { not: null, lte: new Date() },
      },
      select: { id: true, userId: true, expiresAt: true },
      orderBy: { expiresAt: 'asc' },
      take: MOCK_EXPIRED_RECOVERY_BATCH_SIZE,
    });

    return mocks.flatMap((mock) =>
      mock.expiresAt
        ? [{ id: mock.id, userId: mock.userId, expiresAt: mock.expiresAt }]
        : [],
    );
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
    if (Date.now() > mock.expiresAt.getTime() + MOCK_ANSWER_GRACE_MS) {
      throw new ConflictException('Đã hết thời gian, vui lòng nộp bài.');
    }
  }

  // Chia số câu gần đều theo từng topic, sau đó bù từ toàn bộ các topic nếu có topic thiếu câu.
  // Dùng khi tạo mock interview nhiều chủ đề.
  private async findRandomQuestionsForLevelOption(
    topicIds: string[],
    level: MockInterviewLevelOption | undefined,
    take: number,
  ) {
    if (level !== 'MIX') {
      return this.findDistributedRandomQuestionIds(topicIds, level, take);
    }

    const split = splitMixedLevelCounts(take);
    const easy = await this.findDistributedRandomQuestionIds(
      topicIds,
      Level.EASY,
      split.easy,
    );
    const medium = await this.findDistributedRandomQuestionIds(
      topicIds,
      Level.MEDIUM,
      split.medium,
      easy,
    );
    const hard = await this.findDistributedRandomQuestionIds(
      topicIds,
      Level.HARD,
      split.hard,
      [...easy, ...medium],
    );
    const selected = [...easy, ...medium, ...hard];

    // Nếu một level thiếu dữ liệu, bù từ các level còn lại để phiên mock vẫn đủ số câu yêu cầu.
    if (selected.length < take) {
      const extra = await this.findRandomQuestionIds(
        topicIds,
        undefined,
        take - selected.length,
        selected,
      );
      selected.push(...extra);
    }

    return selected;
  }

  // Lấy id câu hỏi ngẫu nhiên, chia đều theo từng topic, có thể loại trừ câu đã chọn.
  // Được sử dụng ở hàm findRandomQuestionsForLevelOption().
  private async findDistributedRandomQuestionIds(
    topicIds: string[],
    level: Level | undefined,
    take: number,
    excludedIds: string[] = [],
  ) {
    const perTopicCounts = splitEvenly(take, topicIds.length);
    const selected = [...excludedIds];
    const result: string[] = [];

    for (const [index, topicId] of topicIds.entries()) {
      const questions = await this.findRandomQuestionIds(
        [topicId],
        level,
        perTopicCounts[index],
        selected,
      );
      result.push(...questions);
      selected.push(...questions);
    }

    if (result.length < take) {
      const extra = await this.findRandomQuestionIds(
        topicIds,
        level,
        take - result.length,
        selected,
      );
      result.push(...extra);
    }

    return result;
  }

  // Hàm thực tế lấy id câu hỏi ngẫu nhiên từ DB, có thể loại trừ các câu đã chọn.
  // Dùng trong hàm findDistributedRandomQuestionIds().
  private async findRandomQuestionIds(
    topicIds: string[],
    level: Level | undefined,
    take: number,
    excludedIds: string[] = [],
  ): Promise<string[]> {
    if (take <= 0) return Promise.resolve([]);
    const levelFilter = level
      ? Prisma.sql`AND "level" = ${level}::"Level"`
      : Prisma.empty;
    const exclusionFilter = excludedIds.length
      ? Prisma.sql`AND "id" NOT IN (${Prisma.join(excludedIds)})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
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

  // Chuyển relation trung gian thành mảng topics phẳng cho frontend, đồng thời giữ topic cũ làm fallback.
  private toMockResponse<T extends { topicLinks: Array<{ topic: unknown }> }>(
    mock: T,
  ) {
    const { topicLinks, ...rest } = mock;
    return { ...rest, topics: topicLinks.map((link) => link.topic) };
  }

  private async releaseLock(key: string, value: string) {
    await this.redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      key,
      value,
    );
  }

  private mockAdvisoryLockKey(mockInterviewId: string) {
    return `mock-interview:${mockInterviewId}`;
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

// Util function để chia số lượng câu hỏi gần đều cho từng topic.
function splitEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from(
    { length: parts },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

// Util function để trộn mảng, dùng khi tạo mock interview nhiều chủ đề.
// Giúp các câu hỏi trong 1 topic không bị xếp liền nhau, tăng tính đa dạng.
function shuffle<T>(items: T[]): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[nextIndex]] = [output[nextIndex], output[index]];
  }
  return output;
}
