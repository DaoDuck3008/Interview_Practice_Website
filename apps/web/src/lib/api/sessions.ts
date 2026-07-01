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

export async function scoreSession(sessionId: string): Promise<Score> {
  const res = await api.post<ApiResponse<Score>>(`/sessions/${sessionId}/score`);
  return res.data.data;
}

export async function improveSession(sessionId: string): Promise<Improvement> {
  const res = await api.post<ApiResponse<Improvement>>(`/sessions/${sessionId}/improve`);
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
  duration: number;
  createdAt: string;
  question: {
    content: string;
    level: Level;
    topic: { name: string };
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
