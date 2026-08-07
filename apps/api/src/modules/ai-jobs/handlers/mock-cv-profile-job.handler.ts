import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import {
  MockCvAnalysisStatus,
  MockCvExtractionQuality,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import {
  MockCvNeedsReuploadError,
  MockCvProfileService,
} from '../../mock-cv/analysis/mock-cv-profile.service';
import type { MockCvProfileJobData } from '../ai-jobs.types';
import { mockCvErrorCode } from '../utils/mock-cv-job.utils';

@Injectable()
export class MockCvProfileJobHandler {
  private readonly logger = new Logger(MockCvProfileJobHandler.name);
  private readonly handledFailureJobIds = new Set<string>();
  private readonly isDev: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mockCvProfile: MockCvProfileService,
    private readonly websocket: WebsocketGateway,
    config: ConfigService,
  ) {
    this.isDev = config.get<string>('NODE_ENV') !== 'production';
  }

  async process(job: Job<MockCvProfileJobData>): Promise<void> {
    const { analysisId, userId, attempt } = job.data;
    const analysis = await this.prisma.mockCvAnalysis.findUnique({
      where: { id: analysisId },
      select: {
        status: true,
        analysisAttempt: true,
        mockCv: {
          select: {
            id: true,
            userId: true,
            fileKey: true,
            targetRole: true,
            extractedText: true,
          },
        },
      },
    });

    // Job hoàn thành sau một lần retry mới thì không được xử lý hoặc ghi đè.
    if (
      !analysis ||
      analysis.mockCv.userId !== userId ||
      analysis.status !== MockCvAnalysisStatus.ANALYZING ||
      analysis.analysisAttempt !== attempt
    ) {
      if (this.isDev) {
        this.logger.debug(
          `Bỏ qua job profile Mock CV cũ hoặc không còn hợp lệ: ${analysisId}/${attempt}.`,
        );
      }
      return;
    }

    try {
      const availableTopics = await this.prisma.topic.findMany({
        where: { parentId: { not: null }, children: { none: {} } },
        select: { slug: true, name: true },
        orderBy: { name: 'asc' },
      });

      let extractedText = analysis.mockCv.extractedText;
      if (!extractedText) {
        extractedText = await this.mockCvProfile.extractFromPrivateFile(
          analysis.mockCv.fileKey,
        );

        // Lưu text đã che PII để retry không phải tải và extract lại PDF từ R2.
        const stored = await this.prisma.mockCv.updateMany({
          where: {
            id: analysis.mockCv.id,
            analysis: {
              is: {
                id: analysisId,
                status: MockCvAnalysisStatus.ANALYZING,
                analysisAttempt: attempt,
              },
            },
          },
          data: { extractedText },
        });
        if (stored.count === 0) return;
      }

      const profile = await this.mockCvProfile.analyzeText({
        targetRole: analysis.mockCv.targetRole,
        cvText: extractedText,
        availableTopics,
      });

      const updated = await this.prisma.mockCvAnalysis.updateMany({
        where: {
          id: analysisId,
          status: MockCvAnalysisStatus.ANALYZING,
          analysisAttempt: attempt,
        },
        data: {
          status: profile.status,
          extractionQuality: profile.extractionQuality,
          detectedDomains: profile.detectedDomains,
          eligibilityReason: profile.eligibilityReason,
          summary: profile.summary,
          topicSlugs: profile.topicSlugs,
          technicalSkills: profile.technicalSkills,
          experienceSignals: profile.experienceSignals,
          strengths: profile.strengths,
          gapsForTargetRole: profile.gapsForTargetRole,
          interviewFocusAreas: profile.interviewFocusAreas,
          claimsToVerify: profile.claimsToVerify,
          projects:
            profile.projects === null
              ? Prisma.DbNull
              : (profile.projects as unknown as Prisma.InputJsonValue),
          promptVersion: profile.promptVersion,
          analysisError: null,
        },
      });
      if (updated.count === 0) return;

      this.websocket.emitToUser(userId, 'mock-cv:analysis-updated', {
        mockCvId: analysis.mockCv.id,
        analysisId,
        status: profile.status,
      });
    } catch (error) {
      if (error instanceof MockCvNeedsReuploadError) {
        await this.handleNeedsReupload(
          analysisId,
          attempt,
          analysis.mockCv.id,
          userId,
          error,
        );
        return;
      }

      const failed = await this.prisma.mockCvAnalysis.updateMany({
        where: {
          id: analysisId,
          status: MockCvAnalysisStatus.ANALYZING,
          analysisAttempt: attempt,
        },
        data: {
          status: MockCvAnalysisStatus.FAILED,
          analysisError: mockCvErrorCode(error),
        },
      });
      if (failed.count === 0) return;

      if (job.id) this.handledFailureJobIds.add(job.id);
      this.logger.error(
        `Job phân tích Mock CV thất bại — analysis ${analysisId}, attempt ${attempt}.`,
        error instanceof Error ? error.stack : undefined,
      );
      this.emitFailure(userId, analysisId, analysis.mockCv.id);
      throw error;
    }
  }

  async onFailed(job: Job<MockCvProfileJobData>): Promise<void> {
    if (job.id && this.handledFailureJobIds.delete(job.id)) return;

    this.logger.error(
      `Job ${job.name} (${job.id}) thất bại: ${job.failedReason}`,
    );
    const { analysisId, userId, attempt } = job.data;
    const failed = await this.prisma.mockCvAnalysis.updateMany({
      where: {
        id: analysisId,
        status: MockCvAnalysisStatus.ANALYZING,
        analysisAttempt: attempt,
      },
      data: {
        status: MockCvAnalysisStatus.FAILED,
        analysisError: 'WORKER_JOB_FAILED',
      },
    });
    if (failed.count === 0) return;
    this.emitFailure(userId, analysisId);
  }

  private async handleNeedsReupload(
    analysisId: string,
    attempt: number,
    mockCvId: string,
    userId: string,
    error: MockCvNeedsReuploadError,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.mockCvAnalysis.updateMany({
        where: {
          id: analysisId,
          status: MockCvAnalysisStatus.ANALYZING,
          analysisAttempt: attempt,
        },
        data: {
          status: MockCvAnalysisStatus.NEEDS_REUPLOAD,
          extractionQuality: MockCvExtractionQuality.LOW,
          detectedDomains: [],
          eligibilityReason: error.userMessage,
          analysisError: null,
          summary: null,
          topicSlugs: [],
          technicalSkills: [],
          experienceSignals: [],
          strengths: [],
          gapsForTargetRole: [],
          interviewFocusAreas: [],
          claimsToVerify: [],
          projects: Prisma.DbNull,
          promptVersion: null,
        },
      });
      if (claim.count === 0) return false;
      if (error.extractedText) {
        await tx.mockCv.update({
          where: { id: mockCvId },
          data: { extractedText: error.extractedText },
        });
      }
      return true;
    });
    if (!updated) return;

    this.websocket.emitToUser(userId, 'mock-cv:analysis-updated', {
      mockCvId,
      analysisId,
      status: MockCvAnalysisStatus.NEEDS_REUPLOAD,
    });
  }

  private emitFailure(userId: string, analysisId: string, mockCvId?: string) {
    this.websocket.emitToUser(userId, 'mock-cv:analysis-updated', {
      ...(mockCvId && { mockCvId }),
      analysisId,
      status: MockCvAnalysisStatus.FAILED,
      message: 'Không thể phân tích CV lúc này. Bạn có thể thử lại sau.',
    });
  }
}
