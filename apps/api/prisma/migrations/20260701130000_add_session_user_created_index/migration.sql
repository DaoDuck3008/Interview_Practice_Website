-- Index cho các truy vấn dashboard (thống kê/lịch sử/heatmap) lọc theo user + thời gian.
CREATE INDEX "Session_userId_createdAt_idx" ON "Session"("userId", "createdAt");
