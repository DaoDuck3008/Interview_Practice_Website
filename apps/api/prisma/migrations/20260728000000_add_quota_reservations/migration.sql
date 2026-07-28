-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('PENDING', 'CONSUMED', 'CANCELED');

-- AlterTable
ALTER TABLE "UsageLog"
ADD COLUMN "status" "UsageStatus" NOT NULL DEFAULT 'CONSUMED',
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UsageLog_userId_status_expiresAt_idx"
ON "UsageLog"("userId", "status", "expiresAt");
