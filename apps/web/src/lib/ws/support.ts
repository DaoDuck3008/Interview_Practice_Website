import { getSocket } from "@/lib/ws/socket";

interface SendSupportPayload {
  content?: string;
  /** URL ảnh đã upload qua POST /support/upload — tùy chọn. */
  imageUrl?: string;
  /** Bắt buộc khi gửi với vai trò ADMIN (chọn đúng thread đang trả lời). */
  targetUserId?: string;
}

/** Gửi tin nhắn hỗ trợ (text và/hoặc ảnh) qua WebSocket. */
export function sendSupportMessage(payload: SendSupportPayload) {
  getSocket()?.emit("support:send", payload);
}
