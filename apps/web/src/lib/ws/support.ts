import { getSocket } from "@/lib/ws/socket";

/**
 * Gửi tin nhắn hỗ trợ qua WebSocket. `targetUserId` bắt buộc khi gửi với vai
 * trò ADMIN (chọn đúng thread đang trả lời) — user gửi không cần truyền.
 */
export function sendSupportMessage(content: string, targetUserId?: string) {
  getSocket()?.emit("support:send", { content, targetUserId });
}
