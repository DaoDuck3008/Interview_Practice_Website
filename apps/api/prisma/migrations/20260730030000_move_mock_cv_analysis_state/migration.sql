-- CreateEnum
CREATE TYPE "MockCvAnalysisStatus" AS ENUM ('PENDING', 'ANALYZING', 'READY', 'UNSUPPORTED', 'NEEDS_REUPLOAD', 'FAILED');

-- AlterTable: analysis phải tồn tại từ lúc PENDING, nên các kết quả profile chỉ bắt buộc khi READY.
ALTER TABLE "MockCvAnalysis"
  ADD COLUMN "status" "MockCvAnalysisStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "extractionQuality" "MockCvExtractionQuality",
  ADD COLUMN "detectedDomains" "MockCvDomain"[] NOT NULL DEFAULT ARRAY[]::"MockCvDomain"[],
  ADD COLUMN "eligibilityReason" TEXT,
  ADD COLUMN "analysisError" TEXT,
  ADD COLUMN "lastRetryAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "MockCvAnalysis"
SET "updatedAt" = "createdAt";

ALTER TABLE "MockCvAnalysis"
  ALTER COLUMN "updatedAt" SET NOT NULL,
  ALTER COLUMN "summary" DROP NOT NULL,
  ALTER COLUMN "topicSlugs" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "technicalSkills" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "experienceSignals" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "strengths" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "gapsForTargetRole" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "interviewFocusAreas" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "claimsToVerify" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "projects" DROP NOT NULL,
  ALTER COLUMN "promptVersion" DROP NOT NULL;

-- Chuyển trạng thái các phân tích đã tồn tại từ bảng CV sang bảng phân tích.
UPDATE "MockCvAnalysis" AS analysis
SET
  "status" = CASE cv."status"::TEXT
    WHEN 'UPLOADED' THEN 'PENDING'::"MockCvAnalysisStatus"
    WHEN 'ANALYZING' THEN 'ANALYZING'::"MockCvAnalysisStatus"
    WHEN 'READY' THEN 'READY'::"MockCvAnalysisStatus"
    WHEN 'UNSUPPORTED' THEN 'UNSUPPORTED'::"MockCvAnalysisStatus"
    WHEN 'NEEDS_REUPLOAD' THEN 'NEEDS_REUPLOAD'::"MockCvAnalysisStatus"
    WHEN 'FAILED' THEN 'FAILED'::"MockCvAnalysisStatus"
  END,
  "extractionQuality" = cv."extractionQuality",
  "detectedDomains" = cv."detectedDomains",
  "eligibilityReason" = cv."eligibilityReason",
  "analysisError" = cv."analysisError",
  "lastRetryAt" = cv."lastRetryAt"
FROM "MockCv" AS cv
WHERE analysis."mockCvId" = cv."id";

-- DropIndex
DROP INDEX "MockCv_userId_status_idx";
DROP INDEX "MockCv_status_updatedAt_idx";

-- AlterTable
ALTER TABLE "MockCv"
  DROP COLUMN "status",
  DROP COLUMN "extractionQuality",
  DROP COLUMN "detectedDomains",
  DROP COLUMN "eligibilityReason",
  DROP COLUMN "analysisError",
  DROP COLUMN "lastRetryAt";

-- DropEnum
DROP TYPE "MockCvStatus";

-- CreateIndex
CREATE INDEX "MockCvAnalysis_status_updatedAt_idx" ON "MockCvAnalysis"("status", "updatedAt");
