-- Dự án quy mô nhỏ dùng retry thủ công; bỏ bảng outbox và các enum chỉ phục vụ cơ chế publish bền vững.
DROP TABLE "JobOutbox";
DROP TYPE "JobOutboxType";
DROP TYPE "JobOutboxStatus";
