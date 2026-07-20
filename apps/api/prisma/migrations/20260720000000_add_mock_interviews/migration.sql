-- CreateEnum
CREATE TYPE "MockInterviewStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'SCORING', 'SCORED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MockInterviewMode" AS ENUM ('TOPIC', 'CUSTOM', 'MIXED');

-- CreateEnum
CREATE TYPE "MockQuestionAnswerStatus" AS ENUM ('PENDING', 'ANSWERED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MockQuestionScoreStatus" AS ENUM ('PENDING', 'QUEUED', 'SCORED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MockOverviewStatus" AS ENUM ('PENDING', 'GENERATED', 'FALLBACK', 'FAILED');

-- CreateTable
CREATE TABLE "MockInterview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "MockInterviewMode" NOT NULL DEFAULT 'TOPIC',
    "status" "MockInterviewStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "topicId" TEXT,
    "level" "Level",
    "totalQuestions" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "scoredAt" TIMESTAMP(3),
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

    CONSTRAINT "MockInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockInterviewQuestion" (
    "id" TEXT NOT NULL,
    "mockInterviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "order" INTEGER NOT NULL,
    "answerStatus" "MockQuestionAnswerStatus" NOT NULL DEFAULT 'PENDING',
    "scoreStatus" "MockQuestionScoreStatus" NOT NULL DEFAULT 'PENDING',
    "scoreError" TEXT,
    "answeredAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),

    CONSTRAINT "MockInterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MockInterview_userId_createdAt_idx" ON "MockInterview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MockInterview_userId_status_idx" ON "MockInterview"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MockInterviewQuestion_sessionId_key" ON "MockInterviewQuestion"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockInterviewQuestion_mockInterviewId_questionId_key" ON "MockInterviewQuestion"("mockInterviewId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockInterviewQuestion_mockInterviewId_order_key" ON "MockInterviewQuestion"("mockInterviewId", "order");

-- CreateIndex
CREATE INDEX "MockInterviewQuestion_mockInterviewId_order_idx" ON "MockInterviewQuestion"("mockInterviewId", "order");

-- AddForeignKey
ALTER TABLE "MockInterview" ADD CONSTRAINT "MockInterview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockInterview" ADD CONSTRAINT "MockInterview_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockInterviewQuestion" ADD CONSTRAINT "MockInterviewQuestion_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "MockInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockInterviewQuestion" ADD CONSTRAINT "MockInterviewQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockInterviewQuestion" ADD CONSTRAINT "MockInterviewQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
