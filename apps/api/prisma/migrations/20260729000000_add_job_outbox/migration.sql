-- Ý định publish job được lưu trong PostgreSQL cùng transaction nghiệp vụ,
-- nhờ đó Redis/BullMQ lỗi không làm mất tác vụ chấm điểm.
CREATE TYPE "JobOutboxStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED');

CREATE TYPE "JobOutboxType" AS ENUM ('SCORE_SESSION');

CREATE TABLE "JobOutbox" (
    "id" TEXT NOT NULL,
    "type" "JobOutboxType" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobOutbox_dedupeKey_key" ON "JobOutbox"("dedupeKey");
CREATE INDEX "JobOutbox_status_nextAttemptAt_idx" ON "JobOutbox"("status", "nextAttemptAt");
