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

    const result = await this.scoring.score(session.transcript, {
      content: session.question.content,
      answerKeySummary: session.question.answerKeySummary,
      answerKeywords: session.question.answerKeywords,
    });

    return this.prisma.score.create({
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

    return this.prisma.improvement.create({
      data: {
        sessionId,
        improvedAnswer: result.improvedAnswer,
        annotations: result.annotations as unknown as Prisma.InputJsonValue,
        keyChanges: result.keyChanges ?? [],
      },
    });
  }
}
