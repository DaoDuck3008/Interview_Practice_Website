import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SpeechService } from '../speech/speech.service';
import { AiCreditsService } from '../ai-credits/ai-credits.service';
import { aiCreditReservationKey } from '../ai-credits/ai-credit-pricing';
import { AiCreditFeature } from '@prisma/client';
import { AiJobsService } from '../ai-jobs/ai-jobs.service';
import { CacheService } from '../../cache/cache.service';
import { MAX_AUDIO_DURATION_SEC } from '../../common/upload/audio.constants';
import {
  SCORING_PROMPT_VERSION,
  type ScoreResult,
} from '../scoring/prompts/scoring.prompt';
import {
  deleteSessionAndAudio,
  transientZeroScore,
} from './session-score.utils';
import { CreateSessionDto } from './dto/create-session.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryAdminSessionDto } from './dto/query-admin-session.dto';
import { ReviewScoreDto } from './dto/review-score.dto';
import { ManualScoreDto } from './dto/manual-score.dto';
import {
  VN_OFFSET_MS,
  vnDayKey,
  vnStartOfDay,
  vnStartOfWeek,
  vnStartOfMonth,
  vnLastNDays,
} from '../../common/utils/vn-time.util';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATS_TTL = 60; // 1 phút — thẻ thống kê admin, chấp nhận trễ vài chục giây
const ME_STATS_TTL = 30; // giây — dashboard cá nhân, invalidate khi tạo session mới

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private speech: SpeechService,
    private aiCredits: AiCreditsService,
    private aiJobs: AiJobsService,
    private cache: CacheService,
  ) {}

  private statsCacheKey(userId: string) {
    return `sessions:me:stats:${userId}`;
  }

  private heatmapCacheKey(userId: string) {
    return `sessions:me:heatmap:${userId}`;
  }

  /** Liệt kê các lần luyện tập của user cho 1 câu hỏi. */
  findByQuestion(userId: string, questionId: string) {
    return this.prisma.session.findMany({
      where: { userId, questionId },
      include: { score: true, improvement: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Dashboard cá nhân ──────────────────────────────

  /** Thống kê toàn thời gian: tổng lượt, tổng thời gian luyện, điểm trung bình. */
  async getMyStats(userId: string) {
    return this.cache.getOrSet(
      this.statsCacheKey(userId),
      ME_STATS_TTL,
      async () => {
        const [totalSessions, durationAgg, scoreAgg] = await Promise.all([
          this.prisma.session.count({ where: { userId } }),
          this.prisma.session.aggregate({
            where: { userId },
            _sum: { duration: true },
          }),
          this.prisma.score.aggregate({
            where: { session: { userId } },
            _avg: {
              technicalScore: true,
              completenessScore: true,
              clarityScore: true,
            },
            _count: { _all: true },
          }),
        ]);

        return {
          totalSessions,
          totalDurationSeconds: durationAgg._sum.duration ?? 0,
          avgTechnical: round1(scoreAgg._avg.technicalScore),
          avgCompleteness: round1(scoreAgg._avg.completenessScore),
          avgClarity: round1(scoreAgg._avg.clarityScore),
          scoredCount: scoreAgg._count._all,
        };
      },
    );
  }

  /** Lịch sử luyện tập (phân trang, mới nhất trước) kèm câu hỏi & điểm. */
  async getMyHistory(userId: string, query: QueryHistoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = { userId, questionId: { not: null } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where,
        select: {
          id: true,
          questionId: true,
          duration: true,
          createdAt: true,
          question: {
            select: {
              content: true,
              level: true,
              topic: { select: { name: true, slug: true } },
            },
          },
          score: {
            select: {
              technicalScore: true,
              completenessScore: true,
              clarityScore: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Dữ liệu 2 biểu đồ trong 1 tháng (giờ VN):
   *  - activity: số buổi luyện mỗi ngày (heatmap)
   *  - progress: điểm trung bình mỗi ngày (technical/completeness/clarity)
   */
  async getMyMonthly(userId: string, month?: string) {
    const { key, start, end } = resolveMonth(month);

    const sessions = await this.prisma.session.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: {
        createdAt: true,
        score: {
          select: {
            technicalScore: true,
            completenessScore: true,
            clarityScore: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const activityMap = new Map<string, number>();
    const progMap = new Map<
      string,
      { t: number; c: number; cl: number; n: number }
    >();

    for (const s of sessions) {
      const day = vnDayKey(s.createdAt);
      activityMap.set(day, (activityMap.get(day) ?? 0) + 1);
      if (s.score) {
        const p = progMap.get(day) ?? { t: 0, c: 0, cl: 0, n: 0 };
        p.t += s.score.technicalScore;
        p.c += s.score.completenessScore;
        p.cl += s.score.clarityScore;
        p.n += 1;
        progMap.set(day, p);
      }
    }

    const activity = [...activityMap.entries()].map(([date, count]) => ({
      date,
      count,
    }));
    const progress = [...progMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, p]) => ({
        date,
        technical: round1(p.t / p.n),
        completeness: round1(p.c / p.n),
        clarity: round1(p.cl / p.n),
      }));

    return { month: key, activity, progress };
  }

  /**
   * Heatmap hoạt động 1 năm gần nhất (giờ VN): từ hôm nay lùi lại đúng 1 năm.
   * Trả các ngày có buổi luyện (sparse) + mốc from/to để FE dựng lưới đầy đủ.
   */
  async getMyHeatmap(userId: string) {
    return this.cache.getOrSet(
      this.heatmapCacheKey(userId),
      ME_STATS_TTL,
      async () => {
        const vnNow = new Date(Date.now() + VN_OFFSET_MS);
        const y = vnNow.getUTCFullYear();
        const m = vnNow.getUTCMonth();
        const d = vnNow.getUTCDate();
        // [start = cùng ngày 1 năm trước, end = hết ngày hôm nay) quy về UTC.
        const startUtc = new Date(Date.UTC(y - 1, m, d) - VN_OFFSET_MS);
        const endUtc = new Date(Date.UTC(y, m, d + 1) - VN_OFFSET_MS);

        const sessions = await this.prisma.session.findMany({
          where: { userId, createdAt: { gte: startUtc, lt: endUtc } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        });

        const map = new Map<string, number>();
        for (const s of sessions) {
          const day = vnDayKey(s.createdAt);
          map.set(day, (map.get(day) ?? 0) + 1);
        }
        const days = [...map.entries()].map(([date, count]) => ({
          date,
          count,
        }));

        return {
          from: vnDayKey(startUtc),
          to: vnDayKey(new Date(endUtc.getTime() - 1)), // hôm nay
          days,
        };
      },
    );
  }

  /**
   * Bước 1: nhận audio -> phiên âm (Groq Whisper) -> upload R2 -> lưu Session.
   * Trả transcript ngay để frontend hiển thị trước khi chấm điểm.
   */
  async create(
    userId: string,
    file: Express.Multer.File,
    dto: CreateSessionDto,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    const sessionId = randomUUID();
    const creditKey = aiCreditReservationKey(
      AiCreditFeature.ANSWER_AUDIO,
      'SESSION',
      sessionId,
    );
    await this.aiCredits.reserve({
      userId,
      feature: AiCreditFeature.ANSWER_AUDIO,
      referenceType: 'SESSION',
      referenceId: sessionId,
      idempotencyKey: creditKey,
    });
    let audioUrl: string | undefined;

    try {
      // Phiên âm trước: nếu lỗi (vd Groq 429) thì chưa tạo file thừa trên R2
      const { transcript, duration: measuredDuration } =
        await this.speech.transcribe(file);

      // `dto.duration` là client tự khai báo — chỉ tin khi gọi qua audio recorder
      // thật của frontend. Đối chiếu với độ dài Groq đo được từ chính file audio
      // để chặn trường hợp gọi thẳng API và khai gian ngắn hơn thực tế.
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
        const created = await tx.session.create({
          data: {
            id: sessionId,
            userId,
            questionId: dto.questionId,
            audioUrl: audioUrl!,
            transcript,
            duration: measuredDuration ?? dto.duration,
          },
        });
        return created;
      });

      await Promise.all([
        this.cache.del(
          this.statsCacheKey(userId),
          this.heatmapCacheKey(userId),
        ),
      ]);

      return {
        id: session.id,
        questionId: session.questionId,
        transcript: session.transcript,
        duration: session.duration,
        createdAt: session.createdAt,
      };
    } catch (err) {
      const cleanup = await Promise.allSettled([
        audioUrl
          ? this.storage.delete(this.storage.keyFromUrl(audioUrl))
          : Promise.resolve(),
        this.aiCredits.releaseByIdempotencyKey(
          creditKey,
          'Không tạo được Session sau khi reserve audio credit.',
        ),
      ]);
      for (const result of cleanup) {
        if (result.status === 'rejected') {
          this.logger.error(
            `Không dọn được tài nguyên sau lỗi tạo Session: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
          );
        }
      }
      throw err;
    }
  }

  /**
   * User báo điểm chấm sai/khiếu nại cho 1 session đã chấm — lưu lại để admin xem xét sau.
   * Idempotent: flag lại chỉ cập nhật thời gian + lý do mới nhất, không lỗi nếu đã flag trước đó.
   */
  async flagScore(sessionId: string, userId: string, reason?: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { score: true },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    if (!session.score) {
      throw new BadRequestException('Session chưa được chấm điểm.');
    }

    await this.prisma.score.update({
      where: { sessionId },
      data: {
        flaggedAt: new Date(),
        flagReason: reason?.trim() || null,
      },
    });

    return { flagged: true };
  }

  /**
   * Bước 2: chấm điểm 1 session bằng DeepSeek — chạy qua hàng đợi (AiJobsService),
   * kết quả đẩy về frontend qua WebSocket khi xong (xem AiJobsProcessor).
   * Cache: đã có score thì trả luôn, không đụng hàng đợi.
   */
  async enqueueScore(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        question: true,
        score: true,
        mockCvInterviewQuestion: true,
      },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    if (session.score) {
      await this.aiCredits.consumeByIdempotencyKey(
        aiCreditReservationKey(
          AiCreditFeature.ANSWER_AUDIO,
          'SESSION',
          sessionId,
        ),
      );
      return { status: 'ready' as const, data: session.score };
    }

    // Câu AI của Mock CV không có questionId; dùng snapshot gắn trực tiếp với Session.
    // Mock CV ưu tiên snapshot để dữ liệu hiển thị/chấm không lệch khi question bank đổi.
    const question = session.mockCvInterviewQuestion ?? session.question;
    if (!question) {
      throw new NotFoundException(
        'Không tìm thấy dữ liệu câu hỏi dùng để chấm Session.',
      );
    }

    // Transcript rỗng (im lặng / Whisper không nhận được gì): chấm 0 ngay tại
    // chỗ, không tốn 1 lượt gọi DeepSeek/hàng đợi vì kết quả chắc chắn là 0 điểm.
    if (!session.transcript.trim() && !session.mockCvInterviewQuestion) {
      const result: ScoreResult = {
        technicalScore: 0,
        completenessScore: 0,
        clarityScore: 0,
        overallScore: 0,
        matchedKeywords: [],
        missedKeywords: question.answerKeywords,
        feedback: {
          summary:
            'Mình chưa nghe được câu trả lời nào. Bạn thử ghi âm lại và trả lời câu hỏi nhé!',
          improvements: [],
        },
        promptVersion: SCORING_PROMPT_VERSION,
      };
      await deleteSessionAndAudio(
        this.prisma,
        this.storage,
        session.id,
        session.audioUrl,
      );
      await this.aiCredits.releaseByIdempotencyKey(
        aiCreditReservationKey(
          AiCreditFeature.ANSWER_AUDIO,
          'SESSION',
          session.id,
        ),
        'Audio không có transcript nên không gọi chấm điểm AI.',
      );
      return { status: 'ready' as const, data: transientZeroScore(result) };
    }

    await this.aiJobs.enqueueScore(sessionId, userId);
    return { status: 'queued' as const };
  }

  /**
   * Bước 3 (on-demand): viết lại câu trả lời tốt hơn — chạy qua hàng đợi, cần
   * đã chấm điểm trước. Cache: đã có improvement thì trả luôn, không gọi lại DeepSeek.
   */
  async enqueueImprove(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { score: true, improvement: true },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    if (!session.score) {
      throw new BadRequestException(
        'Cần chấm điểm trước khi cải thiện câu trả lời.',
      );
    }
    if (session.improvement) {
      await this.aiCredits.consumeByIdempotencyKey(
        aiCreditReservationKey(
          AiCreditFeature.ANSWER_IMPROVEMENT,
          'SESSION_IMPROVEMENT',
          sessionId,
        ),
      );
      return { status: 'ready' as const, data: session.improvement };
    }

    await this.aiCredits.reserve({
      userId,
      feature: AiCreditFeature.ANSWER_IMPROVEMENT,
      referenceType: 'SESSION_IMPROVEMENT',
      referenceId: sessionId,
      idempotencyKey: aiCreditReservationKey(
        AiCreditFeature.ANSWER_IMPROVEMENT,
        'SESSION_IMPROVEMENT',
        sessionId,
      ),
    });
    try {
      await this.aiJobs.enqueueImprove(sessionId, userId);
    } catch (error) {
      await this.aiCredits.releaseByIdempotencyKey(
        aiCreditReservationKey(
          AiCreditFeature.ANSWER_IMPROVEMENT,
          'SESSION_IMPROVEMENT',
          sessionId,
        ),
        'Không enqueue được job cải thiện câu trả lời.',
      );
      throw error;
    }
    return { status: 'queued' as const };
  }

  /** Xem 1 session của chính user — dùng làm fallback khi mất kết nối WebSocket. */
  async getOwned(id: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, userId },
      include: { score: true, improvement: true },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    return session;
  }

  /** Admin: liệt kê session của mọi user (phân trang, filter theo user/topic/level/trạng thái báo cáo). */
  async findAllAdmin(query: QueryAdminSessionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const order = query.order ?? 'desc';

    const where: Prisma.SessionWhereInput = {
      ...(query.search && {
        user: {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      }),
      ...((query.topicId || query.level) && {
        question: {
          ...(query.topicId && { topicId: query.topicId }),
          ...(query.level && { level: query.level }),
        },
      }),
      ...(query.flagged === 'pending' && {
        score: { flaggedAt: { not: null }, flagResolvedAt: null },
      }),
      ...(query.flagged === 'resolved' && {
        score: { flaggedAt: { not: null }, flagResolvedAt: { not: null } },
      }),
      ...(query.flagged === 'none' && {
        OR: [{ score: null }, { score: { flaggedAt: null } }],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where,
        select: {
          id: true,
          duration: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          question: {
            select: {
              id: true,
              content: true,
              level: true,
              topic: { select: { name: true, slug: true } },
            },
          },
          score: {
            select: {
              id: true,
              technicalScore: true,
              completenessScore: true,
              clarityScore: true,
              flaggedAt: true,
              flagReason: true,
              flagResolvedAt: true,
              manuallyEditedAt: true,
            },
          },
        },
        orderBy: { createdAt: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** Admin: DAU/WAU/MAU — số user khác nhau có ít nhất 1 session trong ngày/tuần/tháng hiện tại (giờ VN). */
  async getActiveUsersStats() {
    return this.cache.getOrSet(
      'stats:sessions:active-users',
      STATS_TTL,
      async () => {
        const [dau, wau, mau] = await Promise.all([
          this.prisma.session.findMany({
            where: { createdAt: { gte: vnStartOfDay() } },
            distinct: ['userId'],
            select: { userId: true },
          }),
          this.prisma.session.findMany({
            where: { createdAt: { gte: vnStartOfWeek() } },
            distinct: ['userId'],
            select: { userId: true },
          }),
          this.prisma.session.findMany({
            where: { createdAt: { gte: vnStartOfMonth() } },
            distinct: ['userId'],
            select: { userId: true },
          }),
        ]);
        return { dau: dau.length, wau: wau.length, mau: mau.length };
      },
    );
  }

  /** Admin: số user hoạt động (distinct) theo từng ngày trong `days` ngày gần nhất, zero-fill. */
  async getActiveUsersDaily(days = 30) {
    return this.cache.getOrSet(
      `stats:sessions:active-users-daily:${days}`,
      STATS_TTL,
      async () => {
        const since = vnStartOfDay(new Date(Date.now() - (days - 1) * DAY_MS));
        const rows = await this.prisma.session.findMany({
          where: { createdAt: { gte: since } },
          select: { userId: true, createdAt: true },
        });
        const map = new Map<string, Set<string>>();
        for (const r of rows) {
          const day = vnDayKey(r.createdAt);
          if (!map.has(day)) map.set(day, new Set());
          map.get(day)!.add(r.userId);
        }
        return vnLastNDays(days).map((date) => ({
          date,
          count: map.get(date)?.size ?? 0,
        }));
      },
    );
  }

  /** Admin: xem chi tiết đầy đủ 1 session (transcript, câu hỏi, điểm, cải thiện). */
  async getAdminDetail(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        question: {
          select: {
            id: true,
            content: true,
            answerKeySummary: true,
            answerKeywords: true,
            level: true,
            topic: { select: { name: true, slug: true } },
          },
        },
        score: {
          include: {
            reviewedBy: { select: { id: true, name: true, email: true } },
          },
        },
        improvement: true,
      },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    return session;
  }

  /** Admin: ghi chú nội bộ + đánh dấu đã xử lý xong report bị flag. Idempotent. */
  async reviewFlag(sessionId: string, dto: ReviewScoreDto, adminId: string) {
    const score = await this.prisma.score.findUnique({ where: { sessionId } });
    if (!score) throw new NotFoundException('Session chưa được chấm điểm.');
    if (dto.resolved === true && !score.flaggedAt) {
      throw new BadRequestException('Session này chưa bị báo cáo.');
    }

    return this.prisma.score.update({
      where: { sessionId },
      data: {
        ...(dto.note !== undefined && { adminNote: dto.note?.trim() || null }),
        ...(dto.resolved !== undefined && {
          flagResolvedAt: dto.resolved ? new Date() : null,
        }),
        reviewedById: adminId,
      },
    });
  }

  /** Admin: chấm lại điểm + nhận xét thủ công, ghi đè kết quả AI khi report được xác nhận là đúng. */
  async manualRescore(sessionId: string, dto: ManualScoreDto, adminId: string) {
    const score = await this.prisma.score.findUnique({ where: { sessionId } });
    if (!score) throw new NotFoundException('Session chưa được chấm điểm.');

    return this.prisma.score.update({
      where: { sessionId },
      data: {
        technicalScore: dto.technicalScore,
        completenessScore: dto.completenessScore,
        clarityScore: dto.clarityScore,
        summary: dto.summary,
        improvements: dto.improvements,
        manuallyEditedAt: new Date(),
        reviewedById: adminId,
      },
    });
  }
}

/** Làm tròn 1 chữ số thập phân; null (chưa có điểm) => 0. */
function round1(n: number | null): number {
  return n == null ? 0 : Math.round(n * 10) / 10;
}

/** Khoảng [start, end) UTC của một tháng theo giờ VN + key 'YYYY-MM' chuẩn hoá.
 *  month không hợp lệ (thiếu / MM ngoài 1..12) => tháng hiện tại giờ VN. */
function resolveMonth(month?: string): { key: string; start: Date; end: Date } {
  let y: number;
  let m: number; // 1..12
  const match = month?.match(/^(\d{4})-(\d{2})$/);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    y = Number(match[1]);
    m = Number(match[2]);
  } else {
    const vnNow = new Date(Date.now() + VN_OFFSET_MS);
    y = vnNow.getUTCFullYear();
    m = vnNow.getUTCMonth() + 1;
  }
  const start = new Date(Date.UTC(y, m - 1, 1) - VN_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, 1) - VN_OFFSET_MS);
  return { key: `${y}-${String(m).padStart(2, '0')}`, start, end };
}
