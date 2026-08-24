-- CreateEnum
CREATE TYPE "AiCreditFeature" AS ENUM ('ANSWER_AUDIO', 'ANSWER_IMPROVEMENT', 'MOCK_INTERVIEW_CREATE', 'MOCK_INTERVIEW_OVERVIEW', 'CV_ANALYSIS_10', 'CV_ANALYSIS_20', 'CV_ANALYSIS_30', 'MOCK_CV_OVERVIEW');

-- CreateEnum
CREATE TYPE "CreditCycleSource" AS ENUM ('FREE', 'SUBSCRIPTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "CreditReservationStatus" AS ENUM ('PENDING', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "creditPerCycle" INTEGER NOT NULL DEFAULT 0;

-- Snapshot giá trị policy đã chốt cho các gói hiện hữu; các cycle sau này sẽ
-- copy giá trị này nên việc admin đổi Plan không hồi tố quyền lợi đã cấp.
UPDATE "Plan"
SET "creditPerCycle" = CASE "slug"
    WHEN 'pro-1w' THEN 35
    WHEN 'pro-1m' THEN 150
    WHEN 'pro-3m' THEN 500
    ELSE "creditPerCycle"
END;

-- CreateTable
CREATE TABLE "CreditCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "planId" TEXT,
    "source" "CreditCycleSource" NOT NULL,
    "planName" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "grantedCredits" INTEGER NOT NULL,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "reservedCredits" INTEGER NOT NULL DEFAULT 0,
    "activeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditReservation" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "AiCreditFeature" NOT NULL,
    "credits" INTEGER NOT NULL,
    "status" "CreditReservationStatus" NOT NULL DEFAULT 'PENDING',
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditCycle_activeKey_key" ON "CreditCycle"("activeKey");

-- CreateIndex
CREATE INDEX "CreditCycle_userId_endsAt_idx" ON "CreditCycle"("userId", "endsAt");

-- CreateIndex
CREATE INDEX "CreditCycle_subscriptionId_idx" ON "CreditCycle"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditReservation_idempotencyKey_key" ON "CreditReservation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditReservation_status_expiresAt_idx" ON "CreditReservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "CreditReservation_userId_createdAt_idx" ON "CreditReservation"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditReservation_cycleId_feature_referenceType_referenceId_key" ON "CreditReservation"("cycleId", "feature", "referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "CreditCycle" ADD CONSTRAINT "CreditCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCycle" ADD CONSTRAINT "CreditCycle_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCycle" ADD CONSTRAINT "CreditCycle_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CreditCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
