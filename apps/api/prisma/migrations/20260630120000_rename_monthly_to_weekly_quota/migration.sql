-- Đổi hạn mức "theo tháng" thành "theo tuần". RENAME giữ nguyên dữ liệu cũ.
ALTER TABLE "Plan" RENAME COLUMN "monthlyScoreLimit" TO "weeklyScoreLimit";
