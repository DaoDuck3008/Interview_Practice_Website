import api, { type ApiResponse } from "./api";
import type { Level, Paginated } from "./questions";

export interface Score {
  id: string;
  technicalScore: number;
  completenessScore: number;
  clarityScore: number;
  matchedKeywords: string[];
  missedKeywords: string[];
  summary: string;
  improvements: string[];
}

export interface Session {
  id: string;
  questionId: string;
  transcript: string;
  duration: number;
  createdAt: string;
  score?: Score;
  improvement?: Improvement;
}

export interface Annotation {
  originalSegment: string;
  issue: string;
  suggestion: string;
}

export interface Improvement {
  id: string;
  improvedAnswer: string;
  annotations: Annotation[];
  keyChanges: string[];
}

export async function getSessionsByQuestion(questionId: string): Promise<Session[]> {
  try {
    const res = await api.get<ApiResponse<Session[]>>(`/sessions?questionId=${questionId}`);
    return res.data.data;
  } catch {
    return [];
  }
}

export async function createSession(formData: FormData): Promise<Session> {
  const res = await api.post<ApiResponse<Session>>("/sessions", formData, {
    headers: { "Content-Type": undefined }, // let browser set multipart/form-data with boundary
  });
  return res.data.data;
}

/** Chấm điểm bằng DeepSeek chạy qua hàng đợi — `ready` nếu đã có sẵn (cache/điểm 0 tức thì),
 *  `queued` thì phải chờ sự kiện `score:ready`/`score:failed` qua WebSocket. */
export type ScoreResponse = { status: "ready"; data: Score } | { status: "queued" };

export type ImprovementResponse =
  | { status: "ready"; data: Improvement }
  | { status: "queued" };

export async function scoreSession(sessionId: string): Promise<ScoreResponse> {
  const res = await api.post<ApiResponse<ScoreResponse>>(
    `/sessions/${sessionId}/score`,
  );
  return res.data.data;
}

export async function improveSession(
  sessionId: string,
): Promise<ImprovementResponse> {
  const res = await api.post<ApiResponse<ImprovementResponse>>(
    `/sessions/${sessionId}/improve`,
  );
  return res.data.data;
}

/** Lấy 1 session của chính user — dùng làm fallback khi mất kết nối WebSocket. */
export async function getSession(id: string): Promise<Session> {
  const res = await api.get<ApiResponse<Session>>(`/sessions/${id}`);
  return res.data.data;
}

/** Báo điểm chấm sai/khiếu nại cho 1 session đã chấm. `reason` không bắt buộc. */
export async function flagScore(
  sessionId: string,
  reason?: string,
): Promise<{ flagged: boolean }> {
  const res = await api.post<ApiResponse<{ flagged: boolean }>>(
    `/sessions/${sessionId}/score/flag`,
    { reason },
  );
  return res.data.data;
}

// ─── Admin: quản lý session của mọi user ──────────────────────────────

export interface AdminSessionListItem {
  id: string;
  duration: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  question: {
    id: string;
    content: string;
    level: Level;
    topic: { name: string; slug: string };
  };
  score: {
    id: string;
    technicalScore: number;
    completenessScore: number;
    clarityScore: number;
    flaggedAt: string | null;
    flagReason: string | null;
    flagResolvedAt: string | null;
    manuallyEditedAt: string | null;
  } | null;
}

export interface AdminSessionDetail {
  id: string;
  transcript: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  question: {
    id: string;
    content: string;
    answerKeySummary: string;
    answerKeywords: string[];
    level: Level;
    topic: { name: string; slug: string };
  };
  score:
    | (Score & {
        promptVersion: string | null;
        flaggedAt: string | null;
        flagReason: string | null;
        flagResolvedAt: string | null;
        adminNote: string | null;
        manuallyEditedAt: string | null;
        reviewedBy: { id: string; name: string; email: string } | null;
      })
    | null;
  improvement: Improvement | null;
}

export interface AdminSessionQuery {
  search?: string;
  topicId?: string;
  level?: Level;
  flagged?: "all" | "none" | "pending" | "resolved";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ReviewScorePayload {
  note?: string;
  resolved?: boolean;
}

export interface ManualScorePayload {
  technicalScore: number;
  completenessScore: number;
  clarityScore: number;
  summary: string;
  improvements: string[];
}

/** Admin: liệt kê session của mọi user (phân trang, filter theo user/topic/level/trạng thái báo cáo). */
export async function getSessionsAdmin(
  query: AdminSessionQuery = {},
): Promise<Paginated<AdminSessionListItem>> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value as string | number;
    }
  }
  const res = await api.get<ApiResponse<Paginated<AdminSessionListItem>>>(
    "/sessions/admin",
    { params },
  );
  return res.data.data;
}

/** Admin: xem chi tiết đầy đủ 1 session. */
export async function getSessionAdminDetail(
  id: string,
): Promise<AdminSessionDetail> {
  const res = await api.get<ApiResponse<AdminSessionDetail>>(
    `/sessions/admin/${id}`,
  );
  return res.data.data;
}

/** Admin: ghi chú nội bộ + đánh dấu đã xử lý xong report bị flag. */
export async function reviewSessionFlag(
  id: string,
  payload: ReviewScorePayload,
) {
  const res = await api.patch<ApiResponse<Score>>(
    `/sessions/admin/${id}/review`,
    payload,
  );
  return res.data.data;
}

/** Admin: chấm lại điểm + nhận xét thủ công, ghi đè kết quả AI. */
export async function manualRescoreSession(
  id: string,
  payload: ManualScorePayload,
) {
  const res = await api.patch<ApiResponse<Score>>(
    `/sessions/admin/${id}/score`,
    payload,
  );
  return res.data.data;
}

// ─── Dashboard cá nhân ──────────────────────────────

export interface DashboardStats {
  totalSessions: number;
  totalDurationSeconds: number;
  avgTechnical: number;
  avgCompleteness: number;
  avgClarity: number;
  scoredCount: number;
}

export interface HistoryItem {
  id: string;
  questionId: string;
  duration: number;
  createdAt: string;
  question: {
    content: string;
    level: Level;
    topic: { name: string; slug: string };
  };
  score: {
    technicalScore: number;
    completenessScore: number;
    clarityScore: number;
  } | null;
}

/** Số buổi luyện trong 1 ngày (cho heatmap). date = 'YYYY-MM-DD'. */
export interface ActivityDay {
  date: string;
  count: number;
}

/** Điểm trung bình trong 1 ngày (cho biểu đồ tiến bộ). date = 'YYYY-MM-DD'. */
export interface ProgressPoint {
  date: string;
  technical: number;
  completeness: number;
  clarity: number;
}

export interface MonthlyData {
  month: string; // 'YYYY-MM'
  activity: ActivityDay[];
  progress: ProgressPoint[];
}

/** Heatmap 1 năm gần nhất. from/to = 'YYYY-MM-DD'; days chỉ gồm ngày có buổi luyện. */
export interface HeatmapData {
  from: string;
  to: string;
  days: ActivityDay[];
}

/** Thống kê toàn thời gian cho dashboard. */
export async function getMyStats(): Promise<DashboardStats> {
  const res = await api.get<ApiResponse<DashboardStats>>("/sessions/me/stats");
  return res.data.data;
}

/** Lịch sử luyện tập (phân trang). */
export async function getMyHistory(
  page = 1,
  limit = 10,
): Promise<Paginated<HistoryItem>> {
  const res = await api.get<ApiResponse<Paginated<HistoryItem>>>(
    "/sessions/me/history",
    { params: { page, limit } },
  );
  return res.data.data;
}

/** Dữ liệu biểu đồ tiến bộ theo tháng ('YYYY-MM'; bỏ trống = tháng hiện tại). */
export async function getMyMonthly(month?: string): Promise<MonthlyData> {
  const res = await api.get<ApiResponse<MonthlyData>>("/sessions/me/monthly", {
    params: month ? { month } : {},
  });
  return res.data.data;
}

/** Heatmap hoạt động 1 năm gần nhất (hôm nay lùi lại 1 năm). */
export async function getMyHeatmap(): Promise<HeatmapData> {
  const res = await api.get<ApiResponse<HeatmapData>>("/sessions/me/heatmap");
  return res.data.data;
}
