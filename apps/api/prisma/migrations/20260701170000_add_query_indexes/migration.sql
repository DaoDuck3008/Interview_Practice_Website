-- Question: browse/random/admin-list luôn lọc isActive, thường kèm topicId
CREATE INDEX "Question_isActive_topicId_idx" ON "Question"("isActive", "topicId");

-- Session: findByQuestion + admin filter theo topic (join qua questionId)
CREATE INDEX "Session_questionId_idx" ON "Session"("questionId");

-- Score: admin lọc hàng đợi báo cáo (đang chờ/đã xử lý)
CREATE INDEX "Score_flaggedAt_flagResolvedAt_idx" ON "Score"("flaggedAt", "flagResolvedAt");

-- Order: cron dọn đơn PENDING hết hạn; thay thế index status đơn lẻ (dư thừa)
DROP INDEX "Order_status_idx";
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");

-- Order: admin sổ cái sắp theo ngày tạo (không luôn lọc theo userId)
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- Order: admin lịch sử đơn theo 1 subscription
CREATE INDEX "Order_subscriptionId_idx" ON "Order"("subscriptionId");
