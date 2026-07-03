import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SpeechService } from '../speech/speech.service';
import { ScoringService } from '../scoring/scoring.service';
import { ImprovementService } from '../scoring/improvement.service';
import { QuotaService } from '../quota/quota.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { MAX_AUDIO_DURATION_SEC } from '../../common/upload/audio.constants';
import {
  SCORING_PROMPT_VERSION,
  type ScoreResult,
} from '../scoring/prompts/scoring.prompt';
import { CreateSessionDto } from './dto/create-session.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryAdminSessionDto } from './dto/query-admin-session.dto';
import { ReviewScoreDto } from './dto/review-score.dto';
import { ManualScoreDto } from './dto/manual-score.dto';

// Việt Nam cố định UTC+7 — dùng để gom nhóm theo "ngày/tháng" giờ VN.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * TTL của lock chống double-submit AI (score/improve) trên 1 session.
 * Đủ lớn để phủ hết trường hợp xấu nhất: DeepSeekClient tự retry 1 lần lỗi
 * mạng/timeout (15s timeout x2) CỘNG retry 1 lần lỗi schema ở Scoring/ImprovementService
 * (thêm 15s x2 nữa) — worst-case ~60s. Đặt 70s để có biên an toàn.
 */
const AI_LOCK_TTL_MS = 70_000;

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private speech: SpeechService,
    private scoring: ScoringService,
    private improvement: ImprovementService,
    private quota: QuotaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /** Lock chống 2 request cùng gọi AI (score/improve) cho đúng 1 session. */
  private lockKey(action: 'score' | 'improve', sessionId: string): string {
    return `lock:session:${action}:${sessionId}`;
  }

  private async acquireAiLock(
    action: 'score' | 'improve',
    sessionId: string,
  ): Promise<boolean> {
    const res = await this.redis.set(
      this.lockKey(action, sessionId),
      '1',
      'PX',
      AI_LOCK_TTL_MS,
      'NX',
    );
    return res === 'OK';
  }

  private async releaseAiLock(
    action: 'score' | 'improve',
    sessionId: string,
  ): Promise<void> {
    await this.redis.del(this.lockKey(action, sessionId));
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
  }

  /** Lịch sử luyện tập (phân trang, mới nhất trước) kèm câu hỏi & điểm. */
  async getMyHistory(userId: string, query: QueryHistoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = { userId };

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
    const days = [...map.entries()].map(([date, count]) => ({ date, count }));

    return {
      from: vnDayKey(startUtc),
      to: vnDayKey(new Date(endUtc.getTime() - 1)), // hôm nay
      days,
    };
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

    // Phiên âm trước: nếu lỗi (vd Groq 429) thì chưa tạo file thừa trên R2
    const { transcript, duration: measuredDuration } =
      await this.speech.transcribe(file);

    // `dto.duration` là client tự khai báo — chỉ tin khi gọi qua audio recorder
    // thật của frontend. Đối chiếu với độ dài Groq đo được từ chính file audio
    // để chặn trường hợp gọi thẳng API và khai gian ngắn hơn thực tế.
    if (measuredDuration !== null && measuredDuration > MAX_AUDIO_DURATION_SEC) {
      throw new BadRequestException('Audio không được vượt quá 4 phút.');
    }

    const key = `sessions/${userId}/${randomUUID()}.webm`;
    const audioUrl = await this.storage.uploadStream(
      key,
      file.buffer,
      file.mimetype,
    );

    const session = await this.prisma.session.create({
      data: {
        userId,
        questionId: dto.questionId,
        audioUrl,
        transcript,
        duration: measuredDuration ?? dto.duration,
      },
    });

    // Đếm 1 lượt luyện tập (QuotaGuard đã chặn trước khi tới đây nếu hết lượt).
    await this.quota.record(userId, session.id);

    return {
      id: session.id,
      questionId: session.questionId,
      transcript: session.transcript,
      duration: session.duration,
      createdAt: session.createdAt,
    };
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
   * Bước 2: chấm điểm 1 session bằng DeepSeek. Cache: đã có score thì trả luôn.
   * Lock theo sessionId: double-click/2 tab cùng lúc chỉ 1 request thật sự gọi
   * DeepSeek, request kia bị chặn ngay (409) thay vì cả 2 cùng tốn tiền AI.
   */
  async score(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { question: true, score: true },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    if (session.score) return session.score;

    const locked = await this.acquireAiLock('score', sessionId);
    if (!locked) {
      throw new ConflictException(
        'Session này đang được chấm điểm, vui lòng đợi trong giây lát.',
      );
    }

    try {
      // Re-check sau khi giữ lock: request trước có thể vừa ghi xong.
      const existing = await this.prisma.score.findUnique({
        where: { sessionId },
      });
      if (existing) return existing;

      // Transcript rỗng (im lặng / Whisper không nhận được gì): chấm 0 ngay,
      // không tốn 1 lượt gọi DeepSeek vì kết quả chắc chắn là 0 điểm.
      let result: ScoreResult;
      if (!session.transcript.trim()) {
        result = {
          technicalScore: 0,
          completenessScore: 0,
          clarityScore: 0,
          overallScore: 0,
          matchedKeywords: [],
          missedKeywords: session.question.answerKeywords,
          feedback: {
            summary:
              'Mình chưa nghe được câu trả lời nào. Bạn thử ghi âm lại và trả lời câu hỏi nhé!',
            improvements: [],
          },
          promptVersion: SCORING_PROMPT_VERSION,
        };
      } else {
        result = await this.scoring.score(session.transcript, {
          content: session.question.content,
          answerKeySummary: session.question.answerKeySummary,
          answerKeywords: session.question.answerKeywords,
        });
      }

      // Điểm 0 (trống / lạc đề / sai hoàn toàn): KHÔNG lưu vào DB. Xóa session +
      // audio rồi trả kết quả tạm để frontend vẫn hiển thị nhận xét, nhưng không
      // vào lịch sử luyện tập.
      if (
        result.technicalScore +
          result.completenessScore +
          result.clarityScore ===
        0
      ) {
        await this.deleteSessionAndAudio(session.id, session.audioUrl);
        return this.transientZeroScore(result); // trả kết quả luôn, không lưu DB
      }

      return await this.createScore(sessionId, result);
    } finally {
      await this.releaseAiLock('score', sessionId);
    }
  }

  /** Xóa session + file audio trên R2 (dùng khi không muốn lưu, vd điểm 0). */
  private async deleteSessionAndAudio(sessionId: string, audioUrl: string) {
    await this.prisma.session.delete({ where: { id: sessionId } });
    await this.storage.delete(this.storage.keyFromUrl(audioUrl));
  }

  /** Kết quả điểm 0 trả về cho frontend hiển thị nhưng KHÔNG persist (id rỗng). */
  private transientZeroScore(result: ScoreResult) {
    return {
      id: '',
      technicalScore: result.technicalScore,
      completenessScore: result.completenessScore,
      clarityScore: result.clarityScore,
      matchedKeywords: result.matchedKeywords,
      missedKeywords: result.missedKeywords,
      summary: result.feedback.summary,
      improvements: result.feedback.improvements,
    };
  }

  /**
   * Tạo Score, chịu được race: nếu 2 request song song (double-click) cùng qua
   * check `session.score` rồi cùng create, request thua sẽ vi phạm unique
   * `sessionId` (P2002) — bắt lỗi đó và trả về bản ghi đã tồn tại thay vì 500.
   */
  private async createScore(sessionId: string, result: ScoreResult) {
    try {
      return await this.prisma.score.create({
        data: {
          sessionId,
          technicalScore: result.technicalScore,
          completenessScore: result.completenessScore,
          clarityScore: result.clarityScore,
          matchedKeywords: result.matchedKeywords ?? [],
          missedKeywords: result.missedKeywords ?? [],
          summary: result.feedback.summary,
          improvements: result.feedback.improvements ?? [],
          promptVersion: result.promptVersion,
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        const existing = await this.prisma.score.findUnique({
          where: { sessionId },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  /** True nếu là lỗi vi phạm ràng buộc unique của Prisma (P2002). */
  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === 'P2002'
    );
  }

  /**
   * Bước 3 (on-demand): viết lại câu trả lời tốt hơn. Cần đã chấm điểm trước.
   * Cache: đã có improvement thì trả luôn, không gọi lại DeepSeek.
   * Lock theo sessionId: cùng lý do như `score()` — chặn double-submit gọi trùng AI.
   */
  async improve(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { question: true, score: true, improvement: true },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    if (!session.score) {
      throw new BadRequestException(
        'Cần chấm điểm trước khi cải thiện câu trả lời.',
      );
    }
    if (session.improvement) return session.improvement;

    const locked = await this.acquireAiLock('improve', sessionId);
    if (!locked) {
      throw new ConflictException(
        'Session này đang được tạo bản cải thiện, vui lòng đợi trong giây lát.',
      );
    }

    try {
      const existing = await this.prisma.improvement.findUnique({
        where: { sessionId },
      });
      if (existing) return existing;

      const result = await this.improvement.improve(
        session.transcript,
        {
          content: session.question.content,
          answerKeySummary: session.question.answerKeySummary,
          answerKeywords: session.question.answerKeywords,
        },
        {
          technicalScore: session.score.technicalScore,
          completenessScore: session.score.completenessScore,
          clarityScore: session.score.clarityScore,
          overallScore: 0,
          matchedKeywords: session.score.matchedKeywords,
          missedKeywords: session.score.missedKeywords,
          feedback: {
            summary: session.score.summary,
            improvements: session.score.improvements,
          },
          promptVersion: session.score.promptVersion ?? SCORING_PROMPT_VERSION,
        },
      );

      try {
        return await this.prisma.improvement.create({
          data: {
            sessionId,
            improvedAnswer: result.improvedAnswer,
            annotations:
              result.annotations as unknown as Prisma.InputJsonValue,
            keyChanges: result.keyChanges ?? [],
            promptVersion: result.promptVersion,
          },
        });
      } catch (err) {
        // Race hiếm (lock hết hạn giữa chừng): request khác đã tạo trước -> trả bản ghi đã có.
        if (this.isUniqueViolation(err)) {
          const existing = await this.prisma.improvement.findUnique({
            where: { sessionId },
          });
          if (existing) return existing;
        }
        throw err;
      }
    } finally {
      await this.releaseAiLock('improve', sessionId);
    }
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

/** Key ngày 'YYYY-MM-DD' theo giờ VN từ một Date (lưu UTC). */
function vnDayKey(d: Date): string {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
}
