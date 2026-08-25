ALTER TABLE "CreditCycle" ADD COLUMN "sourceReference" TEXT;

UPDATE "CreditCycle"
SET "sourceReference" = 'legacy:' || "id"
WHERE "sourceReference" IS NULL;

ALTER TABLE "CreditCycle" ALTER COLUMN "sourceReference" SET NOT NULL;
CREATE UNIQUE INDEX "CreditCycle_sourceReference_key" ON "CreditCycle"("sourceReference");
