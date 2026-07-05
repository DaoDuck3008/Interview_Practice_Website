import api, { type ApiResponse } from "./api";

export type SenderRole = "USER" | "ADMIN";

export interface SupportMessage {
  id: string;
  userId: string;
  senderRole: SenderRole;
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface SupportThreadSummary extends SupportMessage {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

/** Lịch sử hội thoại hỗ trợ của chính user hiện tại. */
export async function getMySupportThread(): Promise<SupportMessage[]> {
  const res = await api.get<ApiResponse<SupportMessage[]>>("/support/me");
  return res.data.data;
}

/** Admin: danh sách hội thoại — 1 dòng / user, kèm tin nhắn mới nhất. */
export async function getSupportThreads(): Promise<SupportThreadSummary[]> {
  const res =
    await api.get<ApiResponse<SupportThreadSummary[]>>("/support/threads");
  return res.data.data;
}

/** Admin: lịch sử hội thoại của 1 user cụ thể. */
export async function getSupportThread(
  userId: string,
): Promise<SupportMessage[]> {
  const res = await api.get<ApiResponse<SupportMessage[]>>(
    `/support/threads/${userId}`,
  );
  return res.data.data;
}

/** Upload ảnh đính kèm chat, trả về URL công khai trên R2. */
export async function uploadSupportImage(
  file: File,
): Promise<{ imageUrl: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<ApiResponse<{ imageUrl: string }>>(
    "/support/upload",
    form,
  );
  return res.data.data;
}
