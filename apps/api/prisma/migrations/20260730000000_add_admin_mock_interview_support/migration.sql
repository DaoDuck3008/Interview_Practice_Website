-- Audit các hành động admin trên Mock interview để truy vết việc xem dữ liệu và kích hoạt chấm lại.
ALTER TYPE "AuditAction" ADD VALUE 'MOCK_INTERVIEW_ADMIN_VIEW_DETAIL';
ALTER TYPE "AuditAction" ADD VALUE 'MOCK_INTERVIEW_ADMIN_RETRY_SCORING';

-- Các index cho trang quản trị truy vấn dữ liệu mock của toàn hệ thống.
CREATE INDEX "MockInterview_status_createdAt_idx" ON "MockInterview"("status", "createdAt");
CREATE INDEX "MockInterview_status_updatedAt_idx" ON "MockInterview"("status", "updatedAt");
CREATE INDEX "MockInterviewQuestion_scoreStatus_mockInterviewId_idx" ON "MockInterviewQuestion"("scoreStatus", "mockInterviewId");
