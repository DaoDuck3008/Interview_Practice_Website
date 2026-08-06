import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import {
  MockCvAnalysisStatus,
  MockCvExtractionQuality,
  MockCvQuestionGenerationStatus,
  MockCvQuestionSource,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import { MockCvQuestionGenerationService } from '../../mock-cv-analysis/mock-cv-question-generation.service';
import { MOCK_CV_QUESTION_GENERATION_PROMPT_VERSION } from '../../mock-cv-analysis/prompts/mock-cv-question-generation.prompt';
import type {
  MockCvProfileResult,
  MockCvProjectProfile,
} from '../../mock-cv-analysis/prompts/mock-cv-profile.prompt';
import type { MockCvQuestionGenerationJobData } from '../ai-jobs.types';
import { MockCvQuestionBankService } from '../services/mock-cv-question-bank.service';
import { mockCvErrorCode } from '../utils/mock-cv-job.utils';

@Injectable()
export class MockCvQuestionGenerationJobHandler {
  private readonly logger = new Logger(
    MockCvQuestionGenerationJobHandler.name,
  );
  private readonly handledFailureJobIds = new Set<string>();
  private readonly isDev: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: MockCvQuestionGenerationService,
    private readonly questionBank: MockCvQuestionBankService,
    private readonly websocket: WebsocketGateway,
    config: ConfigService,
  ) {
    this.isDev = config.get<string>('NODE_ENV') !== 'production';
  }

  async process(job: Job<MockCvQuestionGenerationJobData>): Promise<void> {
    const { analysisId, userId, attempt } = job.data;
    const analysis = await this.prisma.mockCvAnalysis.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        mockCvId: true,
        status: true,
        extractionQuality: true,
        detectedDomains: true,
        eligibilityReason: true,
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
        questionGenerationAttempt: true,
        requestedQuestionCount: true,
        mockCv: { select: { userId: true, targetRole: true } },
      },
    });

    // Job cũ sau retry hoặc CV đã bị xóa không được phép sinh/ghi bộ câu hỏi.
    if (
      !analysis ||
      analysis.mockCv.userId !== userId ||
      analysis.status !== MockCvAnalysisStatus.READY ||
      analysis.questionGenerationStatus !==
        MockCvQuestionGenerationStatus.GENERATING ||
      analysis.questionGenerationAttempt !== attempt ||
      !analysis.requestedQuestionCount
    ) {
      if (this.isDev) {
        this.logger.debug(
          `Bỏ qua job sinh câu hỏi Mock CV cũ hoặc không còn hợp lệ: ${analysisId}/${attempt}.`,
        );
      }
      return;
    }

    try {
      const topics = analysis.topicSlugs.length
        ? await this.prisma.topic.findMany({
            where: {
              slug: { in: analysis.topicSlugs },
              parentId: { not: null },
            },
            select: { id: true, name: true },
          })
        : [];
      const bankTarget = Math.floor(analysis.requestedQuestionCount / 2);
      const bankQuestions = await this.questionBank.select(
        topics,
        bankTarget,
        analysis.id,
      );
      const generatedQuestions = await this.generator.generate({
        targetRole: analysis.mockCv.targetRole,
        profile: this.toMockCvProfile(analysis),
        selectedBankQuestions: bankQuestions.map((question) => ({
          content: question.content,
          topicName: question.topic.name,
          level: question.level,
        })),
        requestedQuestionCount:
          analysis.requestedQuestionCount - bankQuestions.length,
      });

      const questions = shuffle([
        ...bankQuestions.map((question) => ({
          bankQuestionId: question.id,
          source: MockCvQuestionSource.QUESTION_BANK,
          focusArea: null,
          content: question.content,
          answerKeySummary: question.answerKeySummary,
          answerKeywords: question.answerKeywords,
          rationale: null,
        })),
        ...generatedQuestions.map((question) => ({
          bankQuestionId: null,
          source: MockCvQuestionSource.AI_GENERATED,
          focusArea: question.focusArea,
          content: question.content,
          answerKeySummary: question.answerKeySummary,
          answerKeywords: question.answerKeywords,
          rationale: question.rationale,
        })),
      ]);

      const stored = await this.prisma.$transaction(async (tx) => {
        // Trạng thái và snapshot được ghi cùng transaction để READY luôn đồng nghĩa bộ câu hỏi đã đầy đủ.
        const claimed = await tx.mockCvAnalysis.updateMany({
          where: {
            id: analysisId,
            status: MockCvAnalysisStatus.READY,
            questionGenerationStatus:
              MockCvQuestionGenerationStatus.GENERATING,
            questionGenerationAttempt: attempt,
          },
          data: {
            questionGenerationStatus: MockCvQuestionGenerationStatus.READY,
            questionGeneratedAt: new Date(),
            questionGenerationError: null,
            questionPromptVersion: MOCK_CV_QUESTION_GENERATION_PROMPT_VERSION,
            selectedBankQuestionCount: bankQuestions.length,
            generatedQuestionCount: generatedQuestions.length,
          },
        });
        if (claimed.count === 0) return false;

        const existingCount = await tx.mockCvQuestion.count({
          where: { mockCvId: analysis.mockCvId },
        });
        if (existingCount > 0) {
          throw new Error(
            'Mock CV đã có bộ câu hỏi nhưng trạng thái chưa đồng bộ.',
          );
        }

        await tx.mockCvQuestion.createMany({
          data: questions.map((question, index) => ({
            mockCvId: analysis.mockCvId,
            ...question,
            order: index + 1,
          })),
        });
        return true;
      });
      if (!stored) return;

      this.websocket.emitToUser(userId, 'mock-cv:questions-updated', {
        mockCvId: analysis.mockCvId,
        analysisId,
        status: MockCvQuestionGenerationStatus.READY,
      });
    } catch (error) {
      const failed = await this.prisma.mockCvAnalysis.updateMany({
        where: {
          id: analysisId,
          status: MockCvAnalysisStatus.READY,
          questionGenerationStatus:
            MockCvQuestionGenerationStatus.GENERATING,
          questionGenerationAttempt: attempt,
        },
        data: {
          questionGenerationStatus: MockCvQuestionGenerationStatus.FAILED,
          questionGenerationError: mockCvErrorCode(error),
        },
      });
      if (failed.count === 0) return;

      if (job.id) this.handledFailureJobIds.add(job.id);
      this.logger.error(
        `Job sinh câu hỏi Mock CV thất bại — analysis ${analysisId}, attempt ${attempt}.`,
        error instanceof Error ? error.stack : undefined,
      );
      this.emitFailure(userId, analysisId, analysis.mockCvId);
      throw error;
    }
  }

  async onFailed(job: Job<MockCvQuestionGenerationJobData>): Promise<void> {
    if (job.id && this.handledFailureJobIds.delete(job.id)) return;

    this.logger.error(
      `Job ${job.name} (${job.id}) thất bại: ${job.failedReason}`,
    );
    const { analysisId, userId, attempt } = job.data;
    const failed = await this.prisma.mockCvAnalysis.updateMany({
      where: {
        id: analysisId,
        status: MockCvAnalysisStatus.READY,
        questionGenerationStatus: MockCvQuestionGenerationStatus.GENERATING,
        questionGenerationAttempt: attempt,
      },
      data: {
        questionGenerationStatus: MockCvQuestionGenerationStatus.FAILED,
        questionGenerationError: 'WORKER_JOB_FAILED',
      },
    });
    if (failed.count === 0) return;
    this.emitFailure(userId, analysisId);
  }

  private toMockCvProfile(analysis: {
    extractionQuality: MockCvExtractionQuality | null;
    detectedDomains: MockCvProfileResult['detectedDomains'];
    eligibilityReason: string | null;
    summary: string | null;
    topicSlugs: string[];
    technicalSkills: string[];
    experienceSignals: string[];
    strengths: string[];
    gapsForTargetRole: string[];
    interviewFocusAreas: string[];
    claimsToVerify: string[];
    projects: Prisma.JsonValue | null;
    promptVersion: string | null;
  }): MockCvProfileResult {
    if (!analysis.extractionQuality || !analysis.eligibilityReason) {
      throw new Error(
        'Profile Mock CV thiếu dữ liệu bắt buộc để sinh câu hỏi.',
      );
    }
    return {
      status: 'READY',
      extractionQuality: analysis.extractionQuality,
      detectedDomains: analysis.detectedDomains,
      eligibilityReason: analysis.eligibilityReason,
      summary: analysis.summary,
      topicSlugs: analysis.topicSlugs,
      technicalSkills: analysis.technicalSkills,
      experienceSignals: analysis.experienceSignals,
      strengths: analysis.strengths,
      gapsForTargetRole: analysis.gapsForTargetRole,
      interviewFocusAreas: analysis.interviewFocusAreas,
      claimsToVerify: analysis.claimsToVerify,
      projects: Array.isArray(analysis.projects)
        ? (analysis.projects as unknown as MockCvProjectProfile[])
        : null,
      promptVersion: analysis.promptVersion ?? 'unknown',
    };
  }

  private emitFailure(userId: string, analysisId: string, mockCvId?: string) {
    this.websocket.emitToUser(userId, 'mock-cv:questions-updated', {
      ...(mockCvId && { mockCvId }),
      analysisId,
      status: MockCvQuestionGenerationStatus.FAILED,
      message: 'Không thể chuẩn bị câu hỏi lúc này. Bạn có thể thử lại sau.',
    });
  }
}

function shuffle<T>(items: T[]): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[nextIndex]] = [output[nextIndex], output[index]];
  }
  return output;
}
