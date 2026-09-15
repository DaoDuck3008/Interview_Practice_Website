-- CreateEnum
CREATE TYPE "StorageCleanupBucket" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "StorageCleanupJob" (
    "id" TEXT NOT NULL,
    "bucket" "StorageCleanupBucket" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageCleanupJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageCleanupJob_bucket_objectKey_key" ON "StorageCleanupJob"("bucket", "objectKey");
CREATE INDEX "StorageCleanupJob_nextAttemptAt_idx" ON "StorageCleanupJob"("nextAttemptAt");
