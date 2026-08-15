import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { basename } from 'path';
import { randomUUID } from 'crypto';
import {
  MockCvAnalysisStatus,
  MockCvQuestionGenerationStatus,
  MockInterviewStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiJobsService } from '../../ai-jobs/ai-jobs.service';
import { StorageService } from '../../storage/storage.service';
import {
  MOCK_CV_TARGET_ROLE_LABELS,
  MOCK_CV_JOB_STALE_MS,
  MOCK_CV_QUESTION_JOB_STALE_MS,
  MOCK_CV_RETRY_COOLDOWN_MS,
} from './mock-cv.constants';
import { hasPdfMagic } from './mock-cv-profile.utils';
import { CreateMockCvDto } from './dto/create-mock-cv.dto';
import { QueryMockCvDto } from './dto/query-mock-cv.dto';

const PUBLIC_ANALYSIS_SELECT = {
  id: true,
  status: true,
  extractionQuality: true,
  detectedDomains: true,
  eligibilityReason: true,
  lastRetryAt: true,
  analysisStartedAt: true,
  summary: true,
  topicSlugs: true,
  technicalSkills: true,
  experienceSignals: true,
  strengths: true,
  gapsForTargetRole: true,
  interviewFocusAreas: true,
  claimsToVerify: true,
  projects: true,
  promptVersion: true,
  questionGenerationStatus: true,
  questionGenerationStartedAt: true,
  requestedQuestionCount: true,
  requestedDurationSeconds: true,
  selectedBankQuestionCount: true,
  generatedQuestionCount: true,
  questionGeneratedAt: true,
  updatedAt: true,
} satisfies Prisma.MockCvAnalysisSelect;

const PUBLIC_MOCK_CV_SELECT = {
  id: true,
  targetRole: true,
  fileName: true,
  fileSize: true,
  createdAt: true,
  updatedAt: true,
  analysis: { select: PUBLIC_ANALYSIS_SELECT },
  interviews: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      status: true,
      overallScore: true,
      submittedAt: true,
    },
  },
  _count: { select: { interviews: true } },
} satisfies Prisma.MockCvSelect;

@Injectable()
export class MockCvAnalysisService {
  private readonly logger = new Logger(MockCvAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly aiJobs: AiJobsService,
  ) {}

  // Tải CV lên storage và tạo bản ghi MockCv.
  async create(
    userId: string,
    dto: CreateMockCvDto,
    file: Express.Multer.File,
  ) {
    // Kiểm tra file có phải PDF hợp lệ trước khi upload lên storage
    this.assertPdf(file);
    const key = `mock-cvs/${userId}/${randomUUID()}.pdf`;
    await this.storage.uploadPrivate(key, file.buffer, 'application/pdf');

    let mockCvId: string;
    let analysisId: string;
    try {
      // Nested create tạo ra MockCvAnalysis theo các giá trị default đi kèm với MockCv
      const created = await this.prisma.mockCv.create({
        data: {
          userId,
          targetRole: MOCK_CV_TARGET_ROLE_LABELS[dto.targetRoleCode],
          fileKey: key,
          fileName: basename(file.originalname).slice(0, 255) || 'cv.pdf',
          mimeType: 'application/pdf',
          fileSize: file.size,
          analysis: {
            create: {
              requestedQuestionCount: dto.totalQuestions,
              requestedDurationSeconds: dto.durationSeconds,
            },
          },
        },
        select: { id: true, analysis: { select: { id: true } } },
      });
      if (!created.analysis) {
        throw new Error('Không tạo được MockCvAnalysis đi kèm MockCv.');
      }
      mockCvId = created.id;
      analysisId = created.analysis.id;
    } catch (error) {
      await this.storage.deletePrivate(key);
      throw error;
    }

    // Gọi AI để phân tích CV, nhưng không chặn việc trả về kết quả cho người dùng.
    await this.claimAndEnqueue(analysisId, userId, false);
    return this.getOwned(mockCvId, userId);
  }

  async findAll(userId: string, query: QueryMockCvDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const sortDirection = query.sortOrder === 'oldest' ? 'asc' : 'desc';
    const where: Prisma.MockCvWhereInput = {
      userId,
      ...(search && {
        OR: [
          { targetRole: { contains: search, mode: 'insensitive' } },
          { fileName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.mockCv.findMany({
        where,
        select: PUBLIC_MOCK_CV_SELECT,
        orderBy: [
          { updatedAt: sortDirection },
          { id: sortDirection },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mockCv.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toPublicResponse(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getOwned(id: string, userId: string) {
    const mockCv = await this.prisma.mockCv.findFirst({
      where: { id, userId },
      select: PUBLIC_MOCK_CV_SELECT,
    });
    if (!mockCv) throw new NotFoundException('Không tìm thấy CV.');
    return this.toPublicResponse(mockCv);
  }

  async retryAnalysis(id: string, userId: string) {
    const mockCv = await this.prisma.mockCv.findFirst({
      where: { id, userId },
      select: {
        analysis: {
          select: {
            id: true,
            status: true,
            analysisStartedAt: true,
            lastRetryAt: true,
          },
        },
      },
    });
    if (!mockCv?.analysis) throw new NotFoundException('Không tìm thấy CV.');

    this.assertCanRetry(mockCv.analysis);
    const claimed = await this.claimAndEnqueue(
      mockCv.analysis.id,
      userId,
      true,
    );
    if (!claimed) {
      throw new ConflictException(
        'CV đang được phân tích hoặc trạng thái đã thay đổi. Vui lòng tải lại trang.',
      );
    }
    return this.getOwned(id, userId);
  }

  async remove(id: string, userId: string) {
    const mockCv = await this.prisma.mockCv.findFirst({
      where: { id, userId },
      select: {
        fileKey: true,
        interviews: {
          select: {
            status: true,
            questions: {
              where: { sessionId: { not: null } },
              select: {
                sessionId: true,
                session: { select: { audioUrl: true } },
              },
            },
          },
        },
      },
    });
    if (!mockCv) throw new NotFoundException('Không tìm thấy CV.');

    const activeStatuses = new Set<MockInterviewStatus>([
      MockInterviewStatus.IN_PROGRESS,
      MockInterviewStatus.SUBMITTED,
      MockInterviewStatus.SCORING,
    ]);
    if (mockCv.interviews.some((item) => activeStatuses.has(item.status))) {
      throw new ConflictException(
        'Không thể xóa CV khi một bài phỏng vấn đang làm hoặc đang được chấm.',
      );
    }

    const sessions = mockCv.interviews.flatMap((interview) =>
      interview.questions.flatMap((question) =>
        question.sessionId
          ? [{ id: question.sessionId, audioUrl: question.session?.audioUrl }]
          : [],
      ),
    );
    await this.prisma.$transaction(async (tx) => {
      if (sessions.length > 0) {
        await tx.session.deleteMany({
          where: { id: { in: sessions.map((session) => session.id) } },
        });
      }
      await tx.mockCv.delete({ where: { id } });
    });

    await Promise.all([
      this.storage.deletePrivate(mockCv.fileKey),
      ...sessions.flatMap((session) =>
        session.audioUrl
          ? [this.storage.delete(this.storage.keyFromUrl(session.audioUrl))]
          : [],
      ),
    ]);
    return { deleted: true };
  }

  // Util function: kiểm tra file có phải PDF hợp lệ hay không, dựa trên magic number của file PDF
  private assertPdf(file: Express.Multer.File) {
    if (file.mimetype !== 'application/pdf' || !hasPdfMagic(file.buffer)) {
      throw new BadRequestException('Nội dung file không phải PDF hợp lệ.');
    }
  }

  private assertCanRetry(analysis: {
    status: MockCvAnalysisStatus;
    analysisStartedAt: Date | null;
    lastRetryAt: Date | null;
  }) {
    const now = Date.now();
    const isStale =
      analysis.status === MockCvAnalysisStatus.ANALYZING &&
      !!analysis.analysisStartedAt &&
      now - analysis.analysisStartedAt.getTime() >= MOCK_CV_JOB_STALE_MS;

    if (
      analysis.status === MockCvAnalysisStatus.READY ||
      analysis.status === MockCvAnalysisStatus.UNSUPPORTED
    ) {
      throw new ConflictException('CV này đã được phân tích xong.');
    }
    if (analysis.status === MockCvAnalysisStatus.NEEDS_REUPLOAD) {
      throw new ConflictException(
        'CV cần được tải lên lại, không thể dùng lại file hiện tại.',
      );
    }
    if (analysis.status === MockCvAnalysisStatus.ANALYZING && !isStale) {
      throw new ConflictException('CV đang được phân tích.');
    }

    const retryAvailableAt = analysis.lastRetryAt
      ? analysis.lastRetryAt.getTime() + MOCK_CV_RETRY_COOLDOWN_MS
      : 0;
    if (now < retryAvailableAt) {
      const waitSeconds = Math.ceil((retryAvailableAt - now) / 1000);
      throw new ConflictException(
        `Vui lòng chờ ${waitSeconds} giây trước khi thử phân tích lại.`,
      );
    }
  }

  /*  Util function: Thử claim job phân tích CV và enqueue job AI. Nếu không claim được (do trạng thái đã thay đổi), trả về false.
  Nhằm tránh race condition khi nhiều request cùng lúc gọi retryAnalysis. */
  private async claimAndEnqueue(
    analysisId: string,
    userId: string,
    isRetry: boolean,
  ): Promise<boolean> {
    const now = new Date();
    const staleAt = new Date(now.getTime() - MOCK_CV_JOB_STALE_MS);
    const claimed = await this.prisma.mockCvAnalysis.updateMany({
      where: {
        id: analysisId,
        OR: [
          {
            status: {
              in: [MockCvAnalysisStatus.PENDING, MockCvAnalysisStatus.FAILED],
            },
          },
          {
            status: MockCvAnalysisStatus.ANALYZING,
            analysisStartedAt: { lte: staleAt },
          },
        ],
      },
      data: {
        status: MockCvAnalysisStatus.ANALYZING,
        analysisAttempt: { increment: 1 },
        analysisStartedAt: now,
        analysisError: null,
        ...(isRetry && { lastRetryAt: now }),
      },
    });
    if (claimed.count === 0) return false;

    const analysis = await this.prisma.mockCvAnalysis.findUnique({
      where: { id: analysisId },
      select: { analysisAttempt: true },
    });
    if (!analysis) return false;

    // Bắt đầu enqueue job AI, nhưng không chặn việc trả về kết quả cho người dùng.
    // Nếu enqueue thất bại, cập nhật lại trạng thái phân tích là FAILED.
    try {
      await this.aiJobs.enqueueMockCvProfile(
        analysisId,
        userId,
        analysis.analysisAttempt,
      );
      return true;
    } catch (error) {
      await this.prisma.mockCvAnalysis.updateMany({
        where: {
          id: analysisId,
          status: MockCvAnalysisStatus.ANALYZING,
          analysisAttempt: analysis.analysisAttempt,
        },
        data: {
          status: MockCvAnalysisStatus.FAILED,
          analysisError: 'QUEUE_ENQUEUE_FAILED',
        },
      });
      this.logger.error(
        `Không thể enqueue job phân tích Mock CV ${analysisId}.`,
        error instanceof Error ? error.stack : undefined,
      );
      return true;
    }
  }

  private toPublicResponse<
    T extends {
      analysis: {
        status: MockCvAnalysisStatus;
        analysisStartedAt: Date | null;
        lastRetryAt: Date | null;
        questionGenerationStatus: MockCvQuestionGenerationStatus;
        questionGenerationStartedAt: Date | null;
      } | null;
      interviews: Array<{
        id: string;
        status: MockInterviewStatus;
        overallScore: number | null;
        submittedAt: Date | null;
      }>;
    },
  >(mockCv: T) {
    const { interviews, ...publicMockCv } = mockCv;
    const analysis = publicMockCv.analysis;
    const now = Date.now();
    const isStale =
      analysis?.status === MockCvAnalysisStatus.ANALYZING &&
      !!analysis.analysisStartedAt &&
      now - analysis.analysisStartedAt.getTime() >= MOCK_CV_JOB_STALE_MS;
    const isQuestionGenerationStale =
      analysis?.questionGenerationStatus === 'GENERATING' &&
      !!analysis.questionGenerationStartedAt &&
      now - analysis.questionGenerationStartedAt.getTime() >=
        MOCK_CV_QUESTION_JOB_STALE_MS;
    const retryAvailableAt = analysis?.lastRetryAt
      ? new Date(analysis.lastRetryAt.getTime() + MOCK_CV_RETRY_COOLDOWN_MS)
      : null;
    const canRetry =
      !!analysis &&
      (analysis.status === MockCvAnalysisStatus.FAILED ||
        analysis.status === MockCvAnalysisStatus.PENDING ||
        isStale) &&
      (!retryAvailableAt || retryAvailableAt.getTime() <= now);

    return {
      ...publicMockCv,
      latestInterview: interviews[0] ?? null,
      analysis: analysis
        ? {
            ...analysis,
            isStale,
            isQuestionGenerationStale,
            canRetry,
            retryAvailableAt,
            failureMessage:
              analysis.status === MockCvAnalysisStatus.FAILED
                ? 'Không thể phân tích CV lúc này. Bạn có thể thử lại sau.'
                : null,
            questionGenerationFailureMessage:
              analysis.questionGenerationStatus === 'FAILED'
                ? 'Không thể chuẩn bị câu hỏi lúc này. Bạn có thể thử lại sau.'
                : null,
          }
        : null,
    };
  }
}
