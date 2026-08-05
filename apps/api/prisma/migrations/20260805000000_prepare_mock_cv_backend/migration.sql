-- CreateEnum
CREATE TYPE "MockCvQuestionGenerationStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MockCvReadiness" AS ENUM ('NOT_READY', 'NEEDS_PRACTICE', 'READY');

-- AlterTable: câu AI của Mock CV không có Question trong question bank.
ALTER TABLE "Session" ALTER COLUMN "questionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MockCvAnalysis"
  ADD COLUMN "analysisAttempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "analysisStartedAt" TIMESTAMP(3),
  ADD COLUMN "questionGenerationStatus" "MockCvQuestionGenerationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "questionGenerationAttempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "questionGenerationStartedAt" TIMESTAMP(3),
  ADD COLUMN "questionGeneratedAt" TIMESTAMP(3),
  ADD COLUMN "questionGenerationError" TEXT,
  ADD COLUMN "questionPromptVersion" TEXT,
  ADD COLUMN "requestedQuestionCount" INTEGER,
  ADD COLUMN "selectedBankQuestionCount" INTEGER,
  ADD COLUMN "generatedQuestionCount" INTEGER;

-- AlterTable
ALTER TABLE "MockCvInterview"
  ADD COLUMN "readiness" "MockCvReadiness",
  ADD COLUMN "claimsToPrepareEvidence" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "overviewPromptVersion" TEXT;

-- CreateIndex
CREATE INDEX "MockCvAnalysis_questionGenerationStatus_updatedAt_idx"
  ON "MockCvAnalysis"("questionGenerationStatus", "updatedAt");
