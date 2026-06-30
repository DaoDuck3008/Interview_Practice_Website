/*
  Warnings:

  - You are about to drop the column `type` on the `UsageLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "UsageLog_userId_type_createdAt_idx";

-- AlterTable
ALTER TABLE "UsageLog" DROP COLUMN "type";

-- DropEnum
DROP TYPE "UsageType";

-- CreateIndex
CREATE INDEX "UsageLog_userId_createdAt_idx" ON "UsageLog"("userId", "createdAt");
