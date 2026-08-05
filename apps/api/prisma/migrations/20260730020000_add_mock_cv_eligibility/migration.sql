-- CreateEnum
CREATE TYPE "MockCvExtractionQuality" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "MockCvDomain" AS ENUM ('SOFTWARE_ENGINEERING', 'QUALITY_ASSURANCE', 'DEVOPS', 'DATA', 'BUSINESS_ANALYSIS', 'PRODUCT_MANAGEMENT', 'UX_UI_DESIGN');

-- AlterEnum
ALTER TYPE "MockCvStatus" ADD VALUE 'UNSUPPORTED';
ALTER TYPE "MockCvStatus" ADD VALUE 'NEEDS_REUPLOAD';

-- AlterTable
ALTER TABLE "MockCv"
  ADD COLUMN "extractionQuality" "MockCvExtractionQuality",
  ADD COLUMN "detectedDomains" "MockCvDomain"[] NOT NULL DEFAULT ARRAY[]::"MockCvDomain"[],
  ADD COLUMN "eligibilityReason" TEXT;
