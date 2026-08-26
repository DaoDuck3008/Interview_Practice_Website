-- AI credits và CreditReservation đã thay thế hoàn toàn quota theo ngày.
DROP TABLE "UsageLog";

ALTER TABLE "Plan"
  DROP COLUMN "isUnlimited",
  DROP COLUMN "dailyScoreLimit";

DROP TYPE "UsageStatus";
