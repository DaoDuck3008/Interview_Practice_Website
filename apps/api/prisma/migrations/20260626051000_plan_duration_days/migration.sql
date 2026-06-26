-- Đổi kỳ hạn gói từ tháng sang ngày (hỗ trợ cả gói tuần). Bảng Plan đang rỗng.
ALTER TABLE "Plan" DROP COLUMN "durationMonths";
ALTER TABLE "Plan" ADD COLUMN "durationDays" INTEGER NOT NULL;
