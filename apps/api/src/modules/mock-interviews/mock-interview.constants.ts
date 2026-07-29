// Cho phép request audio đã bắt đầu sát giờ kết thúc thêm thời gian để hoàn tất upload/phiên âm.
export const MOCK_ANSWER_GRACE_MS = 10_000;
// Tránh worker chốt bài đúng sát ranh giới grace window do sai số lịch chạy/phân phối job.
export const MOCK_AUTO_SUBMIT_BUFFER_MS = 2_000;
// Lớp dự phòng khi delayed job không được tạo hoặc Redis gián đoạn tại thời điểm bắt đầu mock.
export const MOCK_EXPIRED_RECOVERY_INTERVAL_MS = 5 * 60 * 1000;
export const MOCK_EXPIRED_RECOVERY_BATCH_SIZE = 100;
// Sau mốc này kể từ lần cập nhật mock gần nhất, câu QUEUED chưa có điểm được xem là kẹt để user có thể chủ động chấm lại.
export const MOCK_SCORING_STALE_MS = 2 * 60 * 1000;
// Chặn double-click/spam retry nhưng vẫn cho user thử lại không giới hạn khi dịch vụ AI đã hồi phục.
export const MOCK_SCORING_RETRY_COOLDOWN_MS = 60 * 1000;
