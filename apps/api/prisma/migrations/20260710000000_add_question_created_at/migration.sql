-- AlterTable
ALTER TABLE "Question" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Question_isActive_createdAt_idx" ON "Question"("isActive", "createdAt");
