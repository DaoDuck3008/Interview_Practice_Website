import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MockCvAnalysisStatus,
  MockCvQuestionGenerationStatus,
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionScoreStatus,
  Prisma,
  StorageCleanupBucket,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiJobsService } from '../../ai-jobs/ai-jobs.service';
import { MockCvQuestionPreparationService } from '../../ai-jobs/services/mock-cv-question-preparation.service';
import { StorageService } from '../../storage/storage.service';
import { StorageCleanupService } from '../../storage/storage-cleanup.service';
import { MockInterviewJobsService } from '../../mock-interviews/mock-interview-jobs.service';
import { MockCvInterviewsService } from '../interviews/mock-cv-interviews.service';
import {
  MOCK_CV_JOB_STALE_MS,
  MOCK_CV_QUESTION_JOB_STALE_MS,
} from './mock-cv.constants';
import { MockCvAnalysisService } from './mock-cv-analysis.service';
import {
  QueryAdminMockCvDto,
  type MockCvAdminAttentionFilter,
} from './dto/query-admin-mock-cv.dto';
import { MOCK_SCORING_STALE_MS } from '../../mock-core/mock-core.constants';
import { CacheService } from '../../../cache/cache.service';
import { MockCvOperationLockService } from '../mock-cv-operation-lock.service';

const ADMIN_ANALYSIS_SELECT = {
  id: true,
  status: true,
  extractionQuality: true,
  detectedDomains: true,
  eligibilityReason: true,
  analysisError: true,
  lastRetryAt: true,
  analysisAttempt: true,
  analysisStartedAt: true,
  questionGenerationStatus: true,
  questionGenerationAttempt: true,
  questionGenerationStartedAt: true,
  questionGeneratedAt: true,
  questionGenerationError: true,
  requestedQuestionCount: true,
  requestedDurationSeconds: true,
  selectedBankQuestionCount: true,
  generatedQuestionCount: true,
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
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MockCvAnalysisSelect;

const ADMIN_INTERVIEW_SELECT = {
  id: true,
  userId: true,
  title: true,
  status: true,
  totalQuestions: true,
  durationSeconds: true,
  startedAt: true,
  expiresAt: true,
  submittedAt: true,
  scoredAt: true,
  lastScoringRetryAt: true,
  averageTechnicalScore: true,
  averageCompletenessScore: true,
  averageClarityScore: true,
  overallScore: true,
  summary: true,
  strengths: true,
  weaknesses: true,
  nextRecommendations: true,
  overviewStatus: true,
  overviewError: true,
  readiness: true,
  claimsToPrepareEvidence: true,
  createdAt: true,
  updatedAt: true,
  questions: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      order: true,
      source: true,
      focusArea: true,
      content: true,
      answerStatus: true,
      scoreStatus: true,
      scoreError: true,
      answeredAt: true,
      skippedAt: true,
      sessionId: true,
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
} satisfies Prisma.MockCvInterviewSelect;

@Injectable()
export class MockCvAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly storageCleanup: StorageCleanupService,
    private readonly aiJobs: AiJobsService,
    private readonly timerJobs: MockInterviewJobsService,
    private readonly analysisService: MockCvAnalysisService,
    private readonly interviewsService: MockCvInterviewsService,
    private readonly questionPreparation: MockCvQuestionPreparationService,
    private readonly cache: CacheService,
    private readonly operationLock: MockCvOperationLockService,
  ) {}

  async findAll(query: QueryAdminMockCvDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mockCv.findMany({
        where,
        select: {
          id: true,
          targetRole: true,
          fileName: true,
          fileSize: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true } },
          analysis: { select: ADMIN_ANALYSIS_SELECT },
          interviews: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              overallScore: true,
              updatedAt: true,
            },
          },
          _count: { select: { questions: true, interviews: true } },
        },
        orderBy: [
          { updatedAt: query.order ?? 'desc' },
          { id: query.order ?? 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mockCv.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStats() {
    const [total, processing, scoring, attention] = await Promise.all([
      this.prisma.mockCv.count(),
      this.prisma.mockCv.count({
        where: {
          OR: [
            {
              analysis: {
                is: {
                  status: {
                    in: [
                      MockCvAnalysisStatus.PENDING,
                      MockCvAnalysisStatus.ANALYZING,
                    ],
                  },
                },
              },
            },
            {
              analysis: {
                is: {
                  questionGenerationStatus: {
                    in: [
                      MockCvQuestionGenerationStatus.PENDING,
                      MockCvQuestionGenerationStatus.GENERATING,
                    ],
                  },
                },
              },
            },
          ],
        },
      }),
      this.prisma.mockCvInterview.count({
        where: {
          status: {
            in: [MockInterviewStatus.SUBMITTED, MockInterviewStatus.SCORING],
          },
        },
      }),
      this.prisma.mockCv.count({
        where: this.attentionWhere('failed', 'stale'),
      }),
    ]);
    return { total, processing, scoring, attention };
  }

  async getDetail(id: string) {
    const mockCv = await this.prisma.mockCv.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        targetRole: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        analysis: { select: ADMIN_ANALYSIS_SELECT },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            source: true,
            focusArea: true,
            content: true,
            rationale: true,
            createdAt: true,
          },
        },
        interviews: {
          orderBy: { createdAt: 'desc' },
          select: ADMIN_INTERVIEW_SELECT,
        },
      },
    });
    if (!mockCv) throw new NotFoundException('Không tìm thấy Mock CV.');
    return mockCv;
  }

  async retryAnalysis(id: string) {
    const owner = await this.getOwner(id);
    await this.analysisService.retryAnalysis(id, owner.userId, {
      chargeUser: false,
    });
    return this.getDetail(id);
  }

  async retryQuestions(id: string) {
    const owner = await this.getOwner(id);
    if (!owner.analysis) {
      throw new NotFoundException('Không tìm thấy phân tích Mock CV.');
    }
    const result = await this.questionPreparation.ensureQueued(
      owner.analysis.id,
      owner.userId,
    );
    if (result === 'FAILED') {
      throw new ConflictException('Chưa thể tạo lại câu hỏi lúc này.');
    }
    return this.getDetail(id);
  }

  async retryInterviewScoring(interviewId: string) {
    const interview = await this.prisma.mockCvInterview.findUnique({
      where: { id: interviewId },
      select: { mockCvId: true, userId: true },
    });
    if (!interview) {
      throw new NotFoundException('Mock CV Interview không tồn tại.');
    }
    await this.interviewsService.retryScoring(interviewId, interview.userId, {
      chargeOverview: false,
    });
    return this.getDetail(interview.mockCvId);
  }

  async hardDeleteInterview(interviewId: string) {
    const interview = await this.prisma.mockCvInterview.findUnique({
      where: { id: interviewId },
      select: {
        mockCvId: true,
        userId: true,
        status: true,
        updatedAt: true,
        questions: {
          where: { sessionId: { not: null } },
          select: {
            sessionId: true,
            session: { select: { audioUrl: true } },
          },
        },
      },
    });
    if (!interview) {
      throw new NotFoundException('Mock CV Interview không tồn tại.');
    }
    this.assertInterviewCanDelete(interview.status, interview.updatedAt);
    const sessions = this.collectSessions(interview.questions);
    await this.removeJobsOrThrow({
      sessionIds: sessions.map((session) => session.id),
      interviewIds: [interviewId],
    });

    await this.prisma.$transaction(async (tx) => {
      if (sessions.length > 0) {
        await tx.session.deleteMany({
          where: { id: { in: sessions.map((session) => session.id) } },
        });
      }
      await tx.mockCvInterview.delete({ where: { id: interviewId } });
      await this.storageCleanup.scheduleInTransaction(
        tx,
        sessions.flatMap((session) =>
          session.audioUrl
            ? [
                {
                  bucket: StorageCleanupBucket.PUBLIC,
                  objectKey: this.storage.keyFromUrl(session.audioUrl),
                },
              ]
            : [],
        ),
      );
    });
    await this.storageCleanup.processDueBestEffort();
    await this.invalidateSessionCaches(interview.userId);
    return {
      deleted: true as const,
      mockCvId: interview.mockCvId,
      userId: interview.userId,
    };
  }

  async hardDelete(id: string) {
    const lock = await this.operationLock.acquire(id);
    try {
      return await this.hardDeleteLocked(id);
    } finally {
      await this.operationLock.release(lock);
    }
  }

  private async hardDeleteLocked(id: string) {
    const mockCv = await this.prisma.mockCv.findUnique({
      where: { id },
      select: {
        userId: true,
        fileKey: true,
        analysis: {
          select: {
            id: true,
            status: true,
            updatedAt: true,
            analysisStartedAt: true,
            analysisAttempt: true,
            questionGenerationStatus: true,
            questionGenerationStartedAt: true,
            questionGenerationAttempt: true,
          },
        },
        interviews: {
          select: {
            id: true,
            status: true,
            updatedAt: true,
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
    if (!mockCv) throw new NotFoundException('Không tìm thấy Mock CV.');
    this.assertAnalysisCanDelete(mockCv.analysis);
    for (const interview of mockCv.interviews) {
      this.assertInterviewCanDelete(interview.status, interview.updatedAt);
    }

    const sessions = mockCv.interviews.flatMap((interview) =>
      this.collectSessions(interview.questions),
    );
    const analysisJobIds = mockCv.analysis
      ? [
          ...this.attemptJobIds(
            'mock_cv_profile',
            mockCv.analysis.id,
            mockCv.analysis.analysisAttempt,
          ),
          ...this.attemptJobIds(
            'mock_cv_questions',
            mockCv.analysis.id,
            mockCv.analysis.questionGenerationAttempt,
          ),
        ]
      : [];
    await this.removeJobsOrThrow({
      sessionIds: sessions.map((session) => session.id),
      interviewIds: mockCv.interviews.map((interview) => interview.id),
      extraAiJobIds: analysisJobIds,
    });

    await this.prisma.$transaction(async (tx) => {
      if (sessions.length > 0) {
        await tx.session.deleteMany({
          where: { id: { in: sessions.map((session) => session.id) } },
        });
      }
      await tx.mockCv.delete({ where: { id } });
      await this.storageCleanup.scheduleInTransaction(tx, [
        { bucket: StorageCleanupBucket.PRIVATE, objectKey: mockCv.fileKey },
        ...sessions.flatMap((session) =>
          session.audioUrl
            ? [
                {
                  bucket: StorageCleanupBucket.PUBLIC,
                  objectKey: this.storage.keyFromUrl(session.audioUrl),
                },
              ]
            : [],
        ),
      ]);
    });
    await Promise.all([
      this.invalidateSessionCaches(mockCv.userId),
      this.storageCleanup.processDueBestEffort(),
    ]);
    return { deleted: true as const, userId: mockCv.userId };
  }

  private buildWhere(query: QueryAdminMockCvDto): Prisma.MockCvWhereInput {
    const search = query.search?.trim();
    const analysisFilter =
      query.analysisStatus || query.questionStatus
        ? {
            analysis: {
              is: {
                ...(query.analysisStatus && {
                  status: query.analysisStatus,
                }),
                ...(query.questionStatus && {
                  questionGenerationStatus: query.questionStatus,
                }),
              },
            },
          }
        : {};
    return {
      ...(search && {
        OR: [
          { targetRole: { contains: search, mode: 'insensitive' } },
          { fileName: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
      ...analysisFilter,
      ...(query.interviewStatus && {
        interviews: { some: { status: query.interviewStatus } },
      }),
      ...(query.attention &&
        query.attention !== 'all' &&
        this.attentionWhere(query.attention)),
    };
  }

  private attentionWhere(
    ...filters: Array<Exclude<MockCvAdminAttentionFilter, 'all'>>
  ): Prisma.MockCvWhereInput {
    const analysisStaleAt = new Date(Date.now() - MOCK_CV_JOB_STALE_MS);
    const questionsStaleAt = new Date(
      Date.now() - MOCK_CV_QUESTION_JOB_STALE_MS,
    );
    const scoringStaleAt = new Date(Date.now() - MOCK_SCORING_STALE_MS);
    const clauses: Prisma.MockCvWhereInput[] = [];
    if (filters.includes('failed')) {
      clauses.push({
        OR: [
          {
            analysis: {
              is: {
                status: {
                  in: [
                    MockCvAnalysisStatus.FAILED,
                    MockCvAnalysisStatus.NEEDS_REUPLOAD,
                    MockCvAnalysisStatus.UNSUPPORTED,
                  ],
                },
              },
            },
          },
          {
            analysis: {
              is: {
                questionGenerationStatus: MockCvQuestionGenerationStatus.FAILED,
              },
            },
          },
          {
            interviews: {
              some: {
                OR: [
                  {
                    questions: {
                      some: { scoreStatus: MockQuestionScoreStatus.FAILED },
                    },
                  },
                  { overviewStatus: MockOverviewStatus.FAILED },
                ],
              },
            },
          },
        ],
      });
    }
    if (filters.includes('stale')) {
      clauses.push({
        OR: [
          {
            analysis: {
              is: {
                status: MockCvAnalysisStatus.ANALYZING,
                analysisStartedAt: { lte: analysisStaleAt },
              },
            },
          },
          {
            analysis: {
              is: {
                questionGenerationStatus:
                  MockCvQuestionGenerationStatus.GENERATING,
                questionGenerationStartedAt: { lte: questionsStaleAt },
              },
            },
          },
          {
            interviews: {
              some: {
                status: {
                  in: [
                    MockInterviewStatus.SUBMITTED,
                    MockInterviewStatus.SCORING,
                  ],
                },
                updatedAt: { lte: scoringStaleAt },
              },
            },
          },
        ],
      });
    }
    return clauses.length === 1 ? clauses[0] : { OR: clauses };
  }

  private async getOwner(id: string) {
    const mockCv = await this.prisma.mockCv.findUnique({
      where: { id },
      select: { userId: true, analysis: { select: { id: true } } },
    });
    if (!mockCv) throw new NotFoundException('Không tìm thấy Mock CV.');
    return mockCv;
  }

  private assertInterviewCanDelete(
    status: MockInterviewStatus,
    updatedAt: Date,
  ) {
    const processingRecently =
      (status === MockInterviewStatus.SUBMITTED ||
        status === MockInterviewStatus.SCORING) &&
      Date.now() - updatedAt.getTime() < MOCK_SCORING_STALE_MS;
    if (status === MockInterviewStatus.IN_PROGRESS || processingRecently) {
      throw new ConflictException(
        'Không thể xóa bài đang làm hoặc đang được AI xử lý.',
      );
    }
  }

  private assertAnalysisCanDelete(
    analysis: {
      status: MockCvAnalysisStatus;
      analysisStartedAt: Date | null;
      questionGenerationStatus: MockCvQuestionGenerationStatus;
      questionGenerationStartedAt: Date | null;
    } | null,
  ) {
    if (!analysis) return;
    const analysisActive =
      analysis.status === MockCvAnalysisStatus.ANALYZING &&
      (!analysis.analysisStartedAt ||
        Date.now() - analysis.analysisStartedAt.getTime() <
          MOCK_CV_JOB_STALE_MS);
    const questionActive =
      analysis.questionGenerationStatus ===
        MockCvQuestionGenerationStatus.GENERATING &&
      (!analysis.questionGenerationStartedAt ||
        Date.now() - analysis.questionGenerationStartedAt.getTime() <
          MOCK_CV_QUESTION_JOB_STALE_MS);
    if (analysisActive || questionActive) {
      throw new ConflictException('Không thể xóa khi AI vẫn đang xử lý CV.');
    }
  }

  private collectSessions(
    questions: Array<{
      sessionId: string | null;
      session: { audioUrl: string } | null;
    }>,
  ) {
    return questions.flatMap((question) =>
      question.sessionId
        ? [{ id: question.sessionId, audioUrl: question.session?.audioUrl }]
        : [],
    );
  }

  private async removeJobsOrThrow(input: {
    sessionIds: string[];
    interviewIds: string[];
    extraAiJobIds?: string[];
  }) {
    const activeAiJobs = await this.aiJobs.removeJobs([
      ...input.sessionIds.flatMap((id) => [`score_${id}`, `improve_${id}`]),
      ...input.interviewIds.map((id) => `mock_cv_overview_${id}`),
      ...(input.extraAiJobIds ?? []),
    ]);
    const activeTimerJobs = await this.timerJobs.removeAutoSubmitJobs({
      mockCvInterviewIds: input.interviewIds,
    });
    if (activeAiJobs.length > 0 || activeTimerJobs.length > 0) {
      throw new ConflictException(
        'Không thể xóa vì vẫn còn job xử lý đang chạy.',
      );
    }
  }

  private attemptJobIds(prefix: string, id: string, maxAttempt: number) {
    return Array.from(
      { length: Math.max(1, maxAttempt + 1) },
      (_, attempt) => `${prefix}_${id}_${attempt}`,
    );
  }

  private invalidateSessionCaches(userId: string) {
    return this.cache.del(
      `sessions:me:stats:${userId}`,
      `sessions:me:heatmap:${userId}`,
    );
  }
}
