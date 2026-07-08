-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
    'USER_REGISTER',
    'USER_VERIFY_EMAIL',
    'USER_CHANGE_PASSWORD',
    'USER_RESET_PASSWORD',
    'USER_LOCK',
    'USER_UNLOCK',
    'USER_MANUAL_VERIFY',
    'PLAN_CREATE',
    'PLAN_UPDATE',
    'PLAN_DELETE',
    'TOPIC_CREATE',
    'TOPIC_UPDATE',
    'TOPIC_UPLOAD_ICON',
    'TOPIC_DELETE',
    'QUESTION_CREATE',
    'QUESTION_UPDATE',
    'QUESTION_SOFT_DELETE',
    'CHECKOUT_CREATE',
    'PAYMENT_WEBHOOK_PAID',
    'PAYMENT_WEBHOOK_FAILED',
    'PAYMENT_WEBHOOK_IGNORED',
    'PAYMENT_ADMIN_VIEW_DETAIL',
    'PAYMENT_EXPORT',
    'SUBSCRIPTION_CANCEL',
    'SUBSCRIPTION_ACTIVATE',
    'SUBSCRIPTION_GRANT',
    'SUBSCRIPTION_EXPIRE_CRON',
    'SESSION_CREATE',
    'SCORE_FLAG',
    'SCORE_REVIEW',
    'SCORE_MANUAL_RESCORE',
    'SESSION_ADMIN_VIEW_DETAIL'
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "targetUserId" TEXT,
    "method" TEXT,
    "path" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId", "createdAt");
