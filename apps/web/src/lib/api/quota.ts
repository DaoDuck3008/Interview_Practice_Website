import api, { type ApiResponse } from "./api";

export interface QuotaWindow {
  used: number;
  limit: number;
}

export interface QuotaStatus {
  unlimited: boolean;
  daily: QuotaWindow | null; //   null = không giới hạn theo ngày
  monthly: QuotaWindow | null; // null = không giới hạn theo tháng
}

/** Hạn mức luyện tập còn lại của user hiện tại. */
export async function getQuotaStatus(): Promise<QuotaStatus> {
  const res = await api.get<ApiResponse<QuotaStatus>>("/quota/me");
  return res.data.data;
}

/**
 * Cửa sổ giới hạn đang ràng buộc (ưu tiên ngày, rồi tháng) — để hiển thị "còn N lượt".
 * null = không giới hạn (gói unlimited hoặc không cấu hình limit nào).
 */
export function quotaDescriptor(
  status: QuotaStatus | null,
): { remaining: number; limit: number; period: string } | null {
  if (!status || status.unlimited) return null;
  const w = status.daily ?? status.monthly;
  if (!w) return null;
  return {
    remaining: Math.max(0, w.limit - w.used),
    limit: w.limit,
    period: status.daily ? "hôm nay" : "tháng này",
  };
}
