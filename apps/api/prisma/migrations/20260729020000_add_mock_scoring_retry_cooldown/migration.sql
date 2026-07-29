-- Lưu mốc retry gần nhất để cooldown bền vững qua restart, không áp đặt giới hạn tổng số lần retry.
ALTER TABLE "MockInterview" ADD COLUMN "lastScoringRetryAt" TIMESTAMP(3);
