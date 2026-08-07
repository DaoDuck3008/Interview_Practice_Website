/**
 * Vai trò: tập trung các mốc thời gian dùng chung cho vòng đời các loại mock interview.
 * Được dùng bởi utility trong `mock-core`, Mock Interview thường và timer queue;
 * Mock CV Interview sẽ dùng lại các giá trị này ở giai đoạn tiếp theo.
 */

// Cho phép request audio đã bắt đầu sát giờ kết thúc thêm thời gian để hoàn tất upload/phiên âm.
export const MOCK_ANSWER_GRACE_MS = 10_000;
// Tránh worker chốt bài đúng sát ranh giới grace window do sai số lịch chạy/phân phối job.
export const MOCK_AUTO_SUBMIT_BUFFER_MS = 2_000;
// Lớp dự phòng khi delayed job không được tạo hoặc Redis gián đoạn tại thời điểm bắt đầu mock.
export const MOCK_EXPIRED_RECOVERY_INTERVAL_MS = 5 * 60 * 1000;
export const MOCK_EXPIRED_RECOVERY_BATCH_SIZE = 100;
// Sau mốc này, câu QUEUED chưa có điểm được xem là kẹt để user có thể chấm lại.
export const MOCK_SCORING_STALE_MS = 2 * 60 * 1000;
// Chặn double-click retry nhưng không giới hạn tổng số lần user có thể thử lại.
export const MOCK_SCORING_RETRY_COOLDOWN_MS = 60 * 1000;
// Lock chỉ cần sống đủ lâu cho quota, Whisper, upload R2 và transaction ghi Session.
export const MOCK_ANSWER_LOCK_TTL_SEC = 300;
