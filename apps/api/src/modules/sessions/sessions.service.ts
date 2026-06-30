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
import { ScoringService } from '../scoring/scoring.service';
import { ImprovementService } from '../scoring/improvement.service';
import { QuotaService } from '../quota/quota.service';
import type { ScoreResult } from '../scoring/prompts/scoring.prompt';
import { CreateSessionDto } from './dto/create-session.dto';

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
  ) {}

  /** Liệt kê các lần luyện tập của user cho 1 câu hỏi. */
  findByQuestion(userId: string, questionId: string) {
    return this.prisma.session.findMany({
      where: { userId, questionId },
      include: { score: true },
      orderBy: { createdAt: 'asc' },
    });
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
    const { transcript } = await this.speech.transcribe(file);

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
        duration: dto.duration,
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
   * Bước 2: chấm điểm 1 session bằng DeepSeek. Cache: đã có score thì trả luôn.
   */
  async score(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: { question: true, score: true },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    if (session.score) return session.score;

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
      result.technicalScore + result.completenessScore + result.clarityScore ===
      0
    ) {
      await this.deleteSessionAndAudio(session.id, session.audioUrl);
      return this.transientZeroScore(result); // trả kết quả luôn, không lưu DB
    }

    return this.createScore(sessionId, result);
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
      },
    );

    try {
      return await this.prisma.improvement.create({
        data: {
          sessionId,
          improvedAnswer: result.improvedAnswer,
          annotations: result.annotations as unknown as Prisma.InputJsonValue,
          keyChanges: result.keyChanges ?? [],
        },
      });
    } catch (err) {
      // Race như createScore: request song song đã tạo trước -> trả bản ghi đã có.
      if (this.isUniqueViolation(err)) {
        const existing = await this.prisma.improvement.findUnique({
          where: { sessionId },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }
}
