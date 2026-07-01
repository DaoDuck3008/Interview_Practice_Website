-- Cột đánh dấu đã gửi email nhắc gia hạn cho chu kỳ hiện tại (chống gửi lặp).
ALTER TABLE "Subscription" ADD COLUMN "renewalReminderSentAt" TIMESTAMP(3);
