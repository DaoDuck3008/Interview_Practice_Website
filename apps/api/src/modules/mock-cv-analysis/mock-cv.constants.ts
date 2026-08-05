// Constants này được sử dụng tại

// File CV tối đa 5MB
export const MAX_CV_BYTES = 5 * 1024 * 1024;
// Tối đa 20 trang, mỗi trang tối đa 2000 ký tự, tổng cộng tối đa 40.000 ký tự
export const MAX_CV_PAGES = 20;
export const MIN_CV_TEXT_LENGTH = 120;
export const MAX_CV_TEXT_LENGTH = 40_000;

// Tối thiểu 4 câu hỏi, tối đa 20 câu hỏi, mỗi câu hỏi tối thiểu 5 phút, tối đa 2 giờ
export const MIN_MOCK_CV_QUESTIONS = 4;
export const MAX_MOCK_CV_QUESTIONS = 20;
export const MIN_MOCK_CV_DURATION_SECONDS = 5 * 60;
export const MAX_MOCK_CV_DURATION_SECONDS = 120 * 60;

// Job quá mốc này được xem là kẹt để user có thể chủ động thử lại.
export const MOCK_CV_JOB_STALE_MS = 5 * 60 * 1000;
export const MOCK_CV_RETRY_COOLDOWN_MS = 60 * 1000;
