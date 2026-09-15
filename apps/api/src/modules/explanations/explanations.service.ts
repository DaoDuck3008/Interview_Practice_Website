import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TechnicalTermSource, TechnicalTermStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeepSeekClient } from '../ai/clients/deepseek.client';
import { ExplanationCreditsService } from '../explanation-credits/explanation-credits.service';
import {
  CreateExplanationDto,
  ExplanationSource,
} from './dto/create-explanation.dto';
import { UpdateTechnicalTermDto } from './dto/update-technical-term.dto';
import {
  buildTechnicalTermPrompt,
  TECHNICAL_TERM_PROMPT_VERSION,
  TECHNICAL_TERM_SYSTEM_PROMPT,
} from './prompts/technical-term.prompt';
import {
  normalizeSourceText,
  normalizeTechnicalTerm,
} from './technical-term-normalizer';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../redis/redis.module';
import type { Redis } from 'ioredis';
import { vnDayKey } from '../../common/utils/vn-time.util';
import { ExplanationJobsService } from './explanation-jobs.service';
import { GenerateTechnicalTermJob } from './explanation-jobs.types';
import { QueryTechnicalTermsDto } from './dto/query-technical-terms.dto';

const PENDING_MS = 90_000;

@Injectable()
export class ExplanationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: ExplanationCreditsService,
    private readonly deepseek: DeepSeekClient,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jobs: ExplanationJobsService,
  ) {}

  /** Luồng duy nhất từ selection đã xác thực đến cache hit hoặc một lần tạo glossary có quota. */
  async explain(userId: string, dto: CreateExplanationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, isLock: true },
    });
    if (!user || user.isLock)
      throw new NotFoundException('Không tìm thấy tài khoản.');
    if (!user.emailVerified)
      throw new BadRequestException(
        'Vui lòng xác thực email trước khi tạo giải thích mới.',
      );

    const question = await this.prisma.question.findFirst({
      where: { id: dto.questionId, isActive: true },
    });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi.');

    this.validateSelectedTerm(question, dto);

    const normalized = normalizeTechnicalTerm(dto.selectedText);
    const resolved = await this.findResolvedTerm(normalized);
    if (resolved?.status === TechnicalTermStatus.READY)
      return this.toResponse(resolved, true);
    if (resolved?.status === TechnicalTermStatus.PENDING)
      return { termId: resolved.id, status: TechnicalTermStatus.PENDING };
    if (resolved?.status === TechnicalTermStatus.DISABLED)
      throw new BadRequestException('Thuật ngữ này hiện không khả dụng.');

    // NẾU CACHE KHÔNG HIT
    const term = await this.claimNewTerm(normalized, dto.selectedText, userId);
    await this.credits.reserveGeneration(userId, term.id);
    try {
      await this.jobs.enqueue({ termId: term.id, userId, dto });
    } catch (error) {
      await this.prisma.technicalTerm.updateMany({
        where: { id: term.id, status: TechnicalTermStatus.PENDING },
        data: {
          status: TechnicalTermStatus.FAILED,
          failureReason: 'Không enqueue được worker.',
        },
      });
      await this.credits.releaseReservation(
        `explanation:${userId}:${term.id}`,
        'Không enqueue được worker.',
      );
      throw new ServiceUnavailableException(
        'Chưa thể xếp hàng tạo giải thích. Vui lòng thử lại sau.',
      );
    }
    return { termId: term.id, status: TechnicalTermStatus.PENDING };
  }

  /** Chỉ worker gọi DeepSeek */
  async generateInWorker(job: GenerateTechnicalTermJob) {
    const term = await this.prisma.technicalTerm.findUnique({
      where: { id: job.termId },
    });
    if (!term) throw new NotFoundException('Không tìm thấy thuật ngữ.');
    if (term.status === TechnicalTermStatus.READY)
      return this.toResponse(term, true);
    const question = await this.prisma.question.findFirst({
      where: { id: job.dto.questionId, isActive: true },
    });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi.');
    let semaphoreKey: string | null = null;
    let providerCallInFlight = false;
    try {
      semaphoreKey = await this.claimGlobalCapacity();
      // Timeout sau điểm này không cho biết provider đã tính phí hay chưa: giữ PENDING để recovery xử lý.
      providerCallInFlight = true;
      const result = await this.deepseek.callWithUsage({
        systemPrompt: TECHNICAL_TERM_SYSTEM_PROMPT,
        userPrompt: buildTechnicalTermPrompt({
          term: job.dto.selectedText,
          question: question.content.slice(0, 500),
          context: this.sourceOf(question, job.dto.source).slice(0, 500),
        }),
        temperature: 0.2,
        model: 'deepseek-flash',
        thinking: 'disabled',
        maxTokens: 120,
        maxAttempts: 1,
        providerUserId: createHash('sha256')
          .update(job.userId)
          .digest('hex')
          .slice(0, 32),
        timeoutMs: 30_000,
      });
      providerCallInFlight = false;

      const parsed = parseTerm(result.content);
      if (!parsed.isTechnicalTerm)
        throw new BadRequestException(
          'Đoạn được chọn không phải thuật ngữ kỹ thuật.',
        );
      const finalized = await this.finalizeOrMergeTerm(
        job.termId,
        parsed.canonicalTerm,
        parsed.explanation,
        job.dto.selectedText,
        result.inputTokens,
        result.outputTokens,
      );

      await this.credits.consumeReservation(
        `explanation:${job.userId}:${job.termId}`,
      );
      return this.toResponse(finalized, false);
    } catch (error) {
      if (providerCallInFlight) throw error;
      await this.prisma.technicalTerm.updateMany({
        where: { id: job.termId, status: TechnicalTermStatus.PENDING },
        data: {
          status: TechnicalTermStatus.FAILED,
          failureReason:
            error instanceof Error
              ? error.message.slice(0, 300)
              : 'Unknown error',
        },
      });
      await this.credits.releaseReservation(
        `explanation:${job.userId}:${job.termId}`,
        'Không tạo được giải thích.',
      );
      throw error;
    } finally {
      if (semaphoreKey)
        await this.redis.del(semaphoreKey).catch(() => undefined);
    }
  }

  /** Endpoint polling luôn đọc DB, nên vẫn chính xác nếu WebSocket event bị lỡ. */
  async getStatus(id: string) {
    const term = await this.prisma.technicalTerm.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('Không tìm thấy thuật ngữ.');
    const resolved = term.mergedIntoId
      ? await this.prisma.technicalTerm.findUnique({
          where: { id: term.mergedIntoId },
        })
      : term;
    if (resolved?.status === TechnicalTermStatus.READY)
      return this.toResponse(resolved, true);
    return { termId: id, status: resolved?.status ?? term.status };
  }

  /** Chỉ lộ dữ liệu review cần thiết cho admin, không lộ prompt hay token usage. */
  async listAdmin(query: QueryTechnicalTermsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const where = {
      ...(query.search && {
        canonicalTerm: { contains: query.search, mode: 'insensitive' as const },
      }),
      ...(query.status && { status: query.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.technicalTerm.findMany({
        where,
        include: { aliases: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.technicalTerm.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** Tổng quan glossary luôn tính trên toàn bộ dữ liệu, không phụ thuộc filter của bảng admin. */
  async getAdminStats() {
    const [totalTerms, totalAliases, tokenUsage] =
      await this.prisma.$transaction([
        this.prisma.technicalTerm.count(),
        this.prisma.technicalTermAlias.count(),
        this.prisma.technicalTerm.aggregate({
          _sum: { inputTokens: true, outputTokens: true },
        }),
      ]);

    return {
      totalTerms,
      totalAliases,
      totalInputTokens: tokenUsage._sum.inputTokens ?? 0,
      totalOutputTokens: tokenUsage._sum.outputTokens ?? 0,
    };
  }

  /** Sửa/verify glossary là quyền admin và chuyển nguồn nội dung sang ADMIN. */
  async updateAdmin(id: string, dto: UpdateTechnicalTermDto) {
    const term = await this.prisma.technicalTerm.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('Không tìm thấy thuật ngữ.');
    const canonicalTerm = dto.canonicalTerm?.trim() ?? term.canonicalTerm;
    const normalizedKey = normalizeTechnicalTerm(canonicalTerm);
    const updated = await this.prisma.technicalTerm.update({
      where: { id },
      data: {
        canonicalTerm,
        normalizedKey,
        explanation: dto.explanation,
        status: dto.status,
        source: TechnicalTermSource.ADMIN,
      },
    });
    if (dto.aliases)
      await Promise.all(
        dto.aliases.map((alias) =>
          this.prisma.technicalTermAlias.upsert({
            where: { normalizedAlias: normalizeTechnicalTerm(alias) },
            update: { termId: id, originalAlias: alias },
            create: {
              termId: id,
              originalAlias: alias,
              normalizedAlias: normalizeTechnicalTerm(alias),
            },
          }),
        ),
      );
    return updated;
  }

  /** Hard delete chỉ cho term đã tắt để không làm mất glossary đang phục vụ người dùng. */
  async hardDeleteAdmin(id: string) {
    const term = await this.prisma.technicalTerm.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('Không tìm thấy thuật ngữ.');
    if (term.status !== TechnicalTermStatus.DISABLED) {
      throw new BadRequestException(
        'Chỉ có thể xóa vĩnh viễn thuật ngữ đã tắt.',
      );
    }
    await this.prisma.technicalTerm.delete({ where: { id } });
    return { id };
  }

  /** Thu hồi PENDING treo để không biến timeout mạng thành lock vĩnh viễn của glossary. */
  @Cron('*/5 * * * *')
  async recoverStaleTerms() {
    const staleBefore = new Date(Date.now() - PENDING_MS);
    const stale = await this.prisma.technicalTerm.findMany({
      where: {
        status: TechnicalTermStatus.PENDING,
        updatedAt: { lte: staleBefore },
        createdById: { not: null },
      },
      select: { id: true, createdById: true },
      take: 100,
    });
    await Promise.all(
      stale.map(async (term) => {
        await this.prisma.technicalTerm.updateMany({
          where: { id: term.id, status: TechnicalTermStatus.PENDING },
          data: {
            status: TechnicalTermStatus.FAILED,
            failureReason: 'Hết thời gian chờ provider.',
          },
        });
        await this.credits.releaseReservation(
          `explanation:${term.createdById}:${term.id}`,
          'Provider không phản hồi đúng hạn.',
        );
      }),
    );
  }

  /** Không tin selection từ browser: đối chiếu lại đúng trường của Question trong DB. */
  private validateSelectedTerm(question: any, dto: CreateExplanationDto) {
    if (
      /[\x00-\x1F\x7F]/.test(dto.selectedText) ||
      dto.selectedText.trim().split(/\s+/).length > 6
    )
      throw new BadRequestException(
        'Hãy chọn một thuật ngữ ngắn, tối đa 6 từ.',
      );
    const source = this.sourceOf(question, dto.source);
    const selected = normalizeSourceText(dto.selectedText);
    if (!selected || !normalizeSourceText(source).includes(selected))
      throw new BadRequestException(
        'Thuật ngữ phải thuộc nội dung học tập đang hiển thị.',
      );
  }

  private sourceOf(question: any, source: ExplanationSource) {
    if (source === ExplanationSource.QUESTION) return question.content ?? '';
    if (source === ExplanationSource.SUMMARY)
      return question.answerKeySummary ?? '';
    if (source === ExplanationSource.DETAIL_ANSWER)
      return question.detailAnswerKey ?? '';
    return (question.answerKeywords ?? []).join(' ');
  }

  /** Ưu tiên canonical key rồi tới alias để biến thể không tạo thêm lời gọi AI. */
  private async findResolvedTerm(normalized: string) {
    const direct = await this.prisma.technicalTerm.findUnique({
      where: { normalizedKey: normalized },
    });
    if (direct)
      return direct.mergedIntoId
        ? this.prisma.technicalTerm.findUnique({
            where: { id: direct.mergedIntoId },
          })
        : direct;
    const alias = await this.prisma.technicalTermAlias.findUnique({
      where: { normalizedAlias: normalized },
      include: { term: true },
    });
    return alias?.term ?? null;
  }

  /** Unique normalizedKey là khóa distributed lock ở DB cho một term mới. */
  private async claimNewTerm(
    normalized: string,
    original: string,
    userId: string,
  ) {
    const failed = await this.prisma.technicalTerm.findUnique({
      where: { normalizedKey: normalized },
    });
    if (
      failed?.status === TechnicalTermStatus.FAILED &&
      Date.now() - failed.updatedAt.getTime() >= PENDING_MS
    ) {
      const reclaimed = await this.prisma.technicalTerm.updateMany({
        where: {
          id: failed.id,
          status: TechnicalTermStatus.FAILED,
          updatedAt: { lte: new Date(Date.now() - PENDING_MS) },
        },
        data: {
          status: TechnicalTermStatus.PENDING,
          createdById: userId,
          failureReason: null,
        },
      });
      if (reclaimed.count)
        return this.prisma.technicalTerm.findUniqueOrThrow({
          where: { id: failed.id },
        });
    }
    try {
      return await this.prisma.technicalTerm.create({
        data: {
          canonicalTerm: original.trim(),
          normalizedKey: normalized,
          createdById: userId,
        },
      });
    } catch {
      const raced = await this.findResolvedTerm(normalized);
      if (
        raced &&
        raced.status === TechnicalTermStatus.PENDING &&
        Date.now() - raced.updatedAt.getTime() < PENDING_MS
      )
        throw new ConflictException(
          'Thuật ngữ đang được tạo. Vui lòng thử lại sau.',
        );
      if (raced?.status === TechnicalTermStatus.READY)
        throw new ConflictException(
          'Thuật ngữ vừa được tạo. Vui lòng bấm lại để xem kết quả.',
        );
      throw new ServiceUnavailableException(
        'Chưa thể tạo thuật ngữ. Vui lòng thử lại sau.',
      );
    }
  }

  /** Gom spelling/format khác nhau vào một term canonical sau khi AI trả về kết quả. */
  private async finalizeOrMergeTerm(
    id: string,
    canonicalTerm: string,
    explanation: string,
    alias: string,
    inputTokens?: number,
    outputTokens?: number,
  ) {
    const canonicalKey = normalizeTechnicalTerm(canonicalTerm);
    const existing = await this.prisma.technicalTerm.findUnique({
      where: { normalizedKey: canonicalKey },
    });
    if (
      existing &&
      existing.id !== id &&
      existing.status === TechnicalTermStatus.READY
    ) {
      await this.prisma.$transaction([
        this.prisma.technicalTermAlias.upsert({
          where: { normalizedAlias: normalizeTechnicalTerm(alias) },
          update: { termId: existing.id },
          create: {
            termId: existing.id,
            originalAlias: alias,
            normalizedAlias: normalizeTechnicalTerm(alias),
          },
        }),
        this.prisma.technicalTerm.update({
          where: { id },
          data: {
            status: TechnicalTermStatus.MERGED,
            mergedIntoId: existing.id,
          },
        }),
      ]);
      return existing;
    }
    const current = await this.prisma.technicalTerm.update({
      where: { id },
      data: {
        canonicalTerm,
        normalizedKey: canonicalKey,
        explanation,
        status: TechnicalTermStatus.READY,
        promptVersion: TECHNICAL_TERM_PROMPT_VERSION,
        model: 'deepseek-flash',
        inputTokens,
        outputTokens,
      },
    });
    if (normalizeTechnicalTerm(alias) !== canonicalKey)
      await this.prisma.technicalTermAlias.upsert({
        where: { normalizedAlias: normalizeTechnicalTerm(alias) },
        update: { termId: id },
        create: {
          termId: id,
          originalAlias: alias,
          normalizedAlias: normalizeTechnicalTerm(alias),
        },
      });
    return current;
  }

  /** Counter ngày và semaphore Redis bảo vệ chi phí toàn hệ thống, độc lập quota user. */
  private async claimGlobalCapacity() {
    const dayKey = `explanations:daily:${vnDayKey(new Date())}`;
    const count = await this.redis.incr(dayKey);
    if (count === 1) await this.redis.expire(dayKey, 172800);
    if (count > this.config.get<number>('explanation.globalDailyLimit', 500))
      throw new HttpException(
        'Hệ thống đã đạt hạn mức giải thích hôm nay.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const limit = this.config.get<number>('explanation.globalConcurrency', 5);
    for (let index = 0; index < limit; index++) {
      const key = `explanations:slot:${index}`;
      if (await this.redis.set(key, '1', 'PX', 60_000, 'NX')) return key;
    }
    throw new HttpException(
      'Hệ thống đang xử lý nhiều giải thích. Vui lòng thử lại sau.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private toResponse(term: any, cached: boolean) {
    return {
      canonicalTerm: term.canonicalTerm,
      explanation: term.explanation,
      cached,
    };
  }
}

function parseTerm(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      canonicalTerm?: unknown;
      explanation?: unknown;
      isTechnicalTerm?: unknown;
    };
    const explanation =
      typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '';
    // Defense-in-depth: provider không được phép làm kết quả dài dù prompt bị bỏ qua.
    const conciseExplanation = explanation
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(' ');
    const words = conciseExplanation.split(/\s+/).filter(Boolean);
    if (typeof parsed.canonicalTerm !== 'string' || !explanation)
      throw new Error();
    return {
      canonicalTerm: parsed.canonicalTerm.trim().slice(0, 60),
      explanation: words.slice(0, 40).join(' '),
      isTechnicalTerm: parsed.isTechnicalTerm === true,
    };
  } catch {
    throw new ServiceUnavailableException(
      'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.',
    );
  }
}
