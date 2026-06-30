/**
 * Giới hạn dùng chung cho audio luyện tập (chặn lạm dụng + chi phí STT/DeepSeek).
 * Audio thực tế ~5 phút giọng nói (opus/aac) chỉ vài MB, nên 15 MB là dư an toàn
 * cho mọi codec mà vẫn nhỏ hơn ngưỡng 25 MB của Groq.
 */
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

/** Độ dài audio tối đa (giây) — 5 phút. Khớp với auto-stop ở frontend. */
export const MAX_AUDIO_DURATION_SEC = 300;

/**
 * Số ký tự transcript tối đa gửi sang DeepSeek. ~5 phút nói ≈ 4–5k ký tự;
 * 6000 là trần an toàn — vượt thì cắt bớt để chặn chi phí chấm điểm tăng đột biến.
 */
export const MAX_TRANSCRIPT_CHARS = 6000;
