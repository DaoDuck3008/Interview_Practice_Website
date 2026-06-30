-- Thêm cờ khóa tài khoản. Mặc định false (không khóa).
ALTER TABLE "User" ADD COLUMN "isLock" BOOLEAN NOT NULL DEFAULT false;
