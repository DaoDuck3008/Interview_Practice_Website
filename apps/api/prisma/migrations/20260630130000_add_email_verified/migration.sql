-- Thêm cột xác thực email. Mặc định false cho user mới.
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: user hiện có (và tài khoản Google) coi như đã xác thực để không bị khóa.
UPDATE "User" SET "emailVerified" = true WHERE "googleId" IS NOT NULL OR "passwordHash" IS NOT NULL;
