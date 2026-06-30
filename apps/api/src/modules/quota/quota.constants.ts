/**
 * Hạn mức cho user CHƯA có gói (free tier). Paid lấy từ cột trên bảng Plan;
 * free không có Plan nào nên cần default cứng ở đây.
 */
export interface QuotaLimits {
  isUnlimited: boolean;
  dailyLimit: number | null; //   null = không giới hạn theo ngày
  monthlyLimit: number | null; // null = không giới hạn theo tháng
}

export const FREE_TIER_LIMITS: QuotaLimits = {
  isUnlimited: false,
  dailyLimit: 3,
  monthlyLimit: null,
};

// Việt Nam cố định UTC+7 — dùng để tính mốc "hôm nay/tháng này" theo giờ VN.
export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Mốc đầu ngày & đầu tháng theo giờ VN, quy về Date (UTC) để so với createdAt đã lưu UTC. */
export function vnPeriodStarts(now = new Date()): {
  startOfDay: Date;
  startOfMonth: Date;
} {
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const startOfDay = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()) -
      VN_OFFSET_MS,
  );
  const startOfMonth = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), 1) - VN_OFFSET_MS,
  );
  return { startOfDay, startOfMonth };
}
