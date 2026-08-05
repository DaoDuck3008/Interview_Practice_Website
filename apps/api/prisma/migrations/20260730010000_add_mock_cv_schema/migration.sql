-- CreateEnum
CREATE TYPE "MockCvStatus" AS ENUM ('UPLOADED', 'ANALYZING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MockCvQuestionSource" AS ENUM ('QUESTION_BANK', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "MockCvQuestionFocusArea" AS ENUM ('PROJECT', 'EXPERIENCE', 'TECHNICAL_DEPTH', 'CLAIM_VERIFICATION');

-- CreateTable
CREATE TABLE "MockCv" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "extractedText" TEXT,
    "status" "MockCvStatus" NOT NULL DEFAULT 'UPLOADED',
    "analysisError" TEXT,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockCv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockCvAnalysis" (
    "id" TEXT NOT NULL,
    "mockCvId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "topicSlugs" TEXT[] NOT NULL,
    "technicalSkills" TEXT[] NOT NULL,
    "experienceSignals" TEXT[] NOT NULL,
    "strengths" TEXT[] NOT NULL,
    "gapsForTargetRole" TEXT[] NOT NULL,
    "interviewFocusAreas" TEXT[] NOT NULL,
    "claimsToVerify" TEXT[] NOT NULL,
    "projects" JSONB NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockCvAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockCvQuestion" (
    "id" TEXT NOT NULL,
    "mockCvId" TEXT NOT NULL,
    "bankQuestionId" TEXT,
    "source" "MockCvQuestionSource" NOT NULL,
    "focusArea" "MockCvQuestionFocusArea",
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "answerKeySummary" TEXT NOT NULL,
    "answerKeywords" TEXT[] NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockCvQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockCvInterview" (
    "id" TEXT NOT NULL,
    "mockCvId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "MockInterviewStatus" NOT NULL DEFAULT 'DRAFT',
    "totalQuestions" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "scoredAt" TIMESTAMP(3),
    "lastScoringRetryAt" TIMESTAMP(3),
    "averageTechnicalScore" DOUBLE PRECISION,
    "averageCompletenessScore" DOUBLE PRECISION,
    "averageClarityScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "summary" TEXT,
    "strengths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "nextRecommendations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "overviewStatus" "MockOverviewStatus" NOT NULL DEFAULT 'PENDING',
    "overviewError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockCvInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockCvInterviewQuestion" (
    "id" TEXT NOT NULL,
    "mockCvInterviewId" TEXT NOT NULL,
    "mockCvQuestionId" TEXT,
    "sessionId" TEXT,
    "order" INTEGER NOT NULL,
    "source" "MockCvQuestionSource" NOT NULL,
    "focusArea" "MockCvQuestionFocusArea",
    "content" TEXT NOT NULL,
    "answerKeySummary" TEXT NOT NULL,
    "answerKeywords" TEXT[] NOT NULL,
    "answerStatus" "MockQuestionAnswerStatus" NOT NULL DEFAULT 'PENDING',
    "scoreStatus" "MockQuestionScoreStatus" NOT NULL DEFAULT 'PENDING',
    "scoreError" TEXT,
    "answeredAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),

    CONSTRAINT "MockCvInterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockCv_fileKey_key" ON "MockCv"("fileKey");
CREATE INDEX "MockCv_userId_createdAt_idx" ON "MockCv"("userId", "createdAt");
CREATE INDEX "MockCv_userId_status_idx" ON "MockCv"("userId", "status");
CREATE INDEX "MockCv_status_updatedAt_idx" ON "MockCv"("status", "updatedAt");
CREATE UNIQUE INDEX "MockCvAnalysis_mockCvId_key" ON "MockCvAnalysis"("mockCvId");
CREATE UNIQUE INDEX "MockCvQuestion_mockCvId_order_key" ON "MockCvQuestion"("mockCvId", "order");
CREATE INDEX "MockCvQuestion_mockCvId_source_idx" ON "MockCvQuestion"("mockCvId", "source");
CREATE INDEX "MockCvQuestion_bankQuestionId_idx" ON "MockCvQuestion"("bankQuestionId");
CREATE INDEX "MockCvInterview_userId_createdAt_idx" ON "MockCvInterview"("userId", "createdAt");
CREATE INDEX "MockCvInterview_userId_status_idx" ON "MockCvInterview"("userId", "status");
CREATE INDEX "MockCvInterview_mockCvId_createdAt_idx" ON "MockCvInterview"("mockCvId", "createdAt");
CREATE UNIQUE INDEX "MockCvInterviewQuestion_sessionId_key" ON "MockCvInterviewQuestion"("sessionId");
CREATE UNIQUE INDEX "MockCvInterviewQuestion_mockCvInterviewId_order_key" ON "MockCvInterviewQuestion"("mockCvInterviewId", "order");
CREATE INDEX "MockCvInterviewQuestion_mockCvInterviewId_order_idx" ON "MockCvInterviewQuestion"("mockCvInterviewId", "order");
CREATE INDEX "MockCvInterviewQuestion_scoreStatus_mockCvInterviewId_idx" ON "MockCvInterviewQuestion"("scoreStatus", "mockCvInterviewId");

-- AddForeignKey
ALTER TABLE "MockCv" ADD CONSTRAINT "MockCv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MockCvAnalysis" ADD CONSTRAINT "MockCvAnalysis_mockCvId_fkey" FOREIGN KEY ("mockCvId") REFERENCES "MockCv"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockCvQuestion" ADD CONSTRAINT "MockCvQuestion_mockCvId_fkey" FOREIGN KEY ("mockCvId") REFERENCES "MockCv"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockCvQuestion" ADD CONSTRAINT "MockCvQuestion_bankQuestionId_fkey" FOREIGN KEY ("bankQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MockCvInterview" ADD CONSTRAINT "MockCvInterview_mockCvId_fkey" FOREIGN KEY ("mockCvId") REFERENCES "MockCv"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockCvInterview" ADD CONSTRAINT "MockCvInterview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MockCvInterviewQuestion" ADD CONSTRAINT "MockCvInterviewQuestion_mockCvInterviewId_fkey" FOREIGN KEY ("mockCvInterviewId") REFERENCES "MockCvInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockCvInterviewQuestion" ADD CONSTRAINT "MockCvInterviewQuestion_mockCvQuestionId_fkey" FOREIGN KEY ("mockCvQuestionId") REFERENCES "MockCvQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MockCvInterviewQuestion" ADD CONSTRAINT "MockCvInterviewQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
