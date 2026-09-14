ALTER TABLE "Plan" ADD COLUMN "explanationCreditsPerCycle" INTEGER NOT NULL DEFAULT 0;
UPDATE "Plan" SET "explanationCreditsPerCycle" = CASE "slug"
  WHEN 'pro-1w' THEN 15 WHEN 'pro-1m' THEN 60 WHEN 'pro-3m' THEN 180 ELSE "explanationCreditsPerCycle" END;

CREATE TYPE "ExplanationCreditSource" AS ENUM ('FREE', 'SUBSCRIPTION', 'MANUAL');
CREATE TYPE "ExplanationCreditReservationStatus" AS ENUM ('PENDING', 'CONSUMED', 'RELEASED', 'EXPIRED');
CREATE TYPE "TechnicalTermStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'MERGED', 'DISABLED');
CREATE TYPE "TechnicalTermSource" AS ENUM ('AI', 'ADMIN');

CREATE TABLE "TechnicalTerm" (
 "id" TEXT NOT NULL, "canonicalTerm" TEXT NOT NULL, "normalizedKey" TEXT NOT NULL,
 "explanation" TEXT, "status" "TechnicalTermStatus" NOT NULL DEFAULT 'PENDING', "source" "TechnicalTermSource" NOT NULL DEFAULT 'AI', "isVerified" BOOLEAN NOT NULL DEFAULT false,
 "promptVersion" TEXT, "model" TEXT, "inputTokens" INTEGER, "outputTokens" INTEGER, "createdById" TEXT, "mergedIntoId" TEXT, "failureReason" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "TechnicalTerm_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TechnicalTerm_normalizedKey_key" ON "TechnicalTerm"("normalizedKey");
CREATE INDEX "TechnicalTerm_status_updatedAt_idx" ON "TechnicalTerm"("status", "updatedAt");
CREATE INDEX "TechnicalTerm_createdById_createdAt_idx" ON "TechnicalTerm"("createdById", "createdAt");

CREATE TABLE "TechnicalTermAlias" ("id" TEXT NOT NULL, "termId" TEXT NOT NULL, "originalAlias" TEXT NOT NULL, "normalizedAlias" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TechnicalTermAlias_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TechnicalTermAlias_normalizedAlias_key" ON "TechnicalTermAlias"("normalizedAlias");

CREATE TABLE "ExplanationCreditCycle" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "subscriptionId" TEXT, "planId" TEXT, "source" "ExplanationCreditSource" NOT NULL, "sourceReference" TEXT NOT NULL, "planName" TEXT, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3), "grantedCredits" INTEGER NOT NULL, "usedCredits" INTEGER NOT NULL DEFAULT 0, "reservedCredits" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ExplanationCreditCycle_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ExplanationCreditCycle_sourceReference_key" ON "ExplanationCreditCycle"("sourceReference");
CREATE INDEX "ExplanationCreditCycle_userId_endsAt_idx" ON "ExplanationCreditCycle"("userId", "endsAt");
CREATE INDEX "ExplanationCreditCycle_subscriptionId_idx" ON "ExplanationCreditCycle"("subscriptionId");

CREATE TABLE "ExplanationCreditReservation" ("id" TEXT NOT NULL, "cycleId" TEXT NOT NULL, "userId" TEXT NOT NULL, "credits" INTEGER NOT NULL DEFAULT 1, "status" "ExplanationCreditReservationStatus" NOT NULL DEFAULT 'PENDING', "referenceType" TEXT NOT NULL, "referenceId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "releasedAt" TIMESTAMP(3), "failureReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ExplanationCreditReservation_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ExplanationCreditReservation_idempotencyKey_key" ON "ExplanationCreditReservation"("idempotencyKey");
CREATE UNIQUE INDEX "ExplanationCreditReservation_cycleId_referenceType_referenceId_key" ON "ExplanationCreditReservation"("cycleId", "referenceType", "referenceId");
CREATE INDEX "ExplanationCreditReservation_status_expiresAt_idx" ON "ExplanationCreditReservation"("status", "expiresAt");
CREATE INDEX "ExplanationCreditReservation_userId_createdAt_idx" ON "ExplanationCreditReservation"("userId", "createdAt");

ALTER TABLE "TechnicalTerm" ADD CONSTRAINT "TechnicalTerm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechnicalTerm" ADD CONSTRAINT "TechnicalTerm_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "TechnicalTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TechnicalTermAlias" ADD CONSTRAINT "TechnicalTermAlias_termId_fkey" FOREIGN KEY ("termId") REFERENCES "TechnicalTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExplanationCreditCycle" ADD CONSTRAINT "ExplanationCreditCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExplanationCreditCycle" ADD CONSTRAINT "ExplanationCreditCycle_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExplanationCreditCycle" ADD CONSTRAINT "ExplanationCreditCycle_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExplanationCreditReservation" ADD CONSTRAINT "ExplanationCreditReservation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ExplanationCreditCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExplanationCreditReservation" ADD CONSTRAINT "ExplanationCreditReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
