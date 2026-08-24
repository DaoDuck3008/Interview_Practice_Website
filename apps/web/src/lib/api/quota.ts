import api, { type ApiResponse } from "./api";

export interface QuotaWindow {
  used: number;
  limit: number;
}

export interface QuotaStatus {
  unlimited: boolean;
  daily: QuotaWindow | null; //  null = không giới hạn theo ngày
  todayCount: number; // số lượt đã luyện hôm nay — luôn có, kể cả gói unlimited
}

/** Hạn mức luyện tập còn lại của user hiện tại. */
export async function getQuotaStatus(): Promise<QuotaStatus> {
  const res = await api.get<ApiResponse<QuotaStatus>>("/quota/me");
  return res.data.data;
}

/**
 * Cửa sổ giới hạn theo ngày đang ràng buộc — để hiển thị "còn N lượt".
 * null = không giới hạn (gói unlimited hoặc không cấu hình limit nào).
 */
export function quotaDescriptor(
  status: QuotaStatus | null,
): { remaining: number; limit: number; period: string } | null {
  if (!status || status.unlimited) return null;
  const w = status.daily;
  if (!w) return null;
  return {
    remaining: Math.max(0, w.limit - w.used),
    limit: w.limit,
    period: "hôm nay",
  };
}
