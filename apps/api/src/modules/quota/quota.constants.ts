/**
 * Hạn mức cho user CHƯA có gói (free tier). Paid lấy từ cột trên bảng Plan;
 * free không có Plan nào nên cần default cứng ở đây.
 */
export interface QuotaLimits {
  isUnlimited: boolean;
  dailyLimit: number | null; //  null = không giới hạn theo ngày
  weeklyLimit: number | null; // null = không giới hạn theo tuần
}

export const FREE_TIER_LIMITS: QuotaLimits = {
  isUnlimited: false,
  dailyLimit: 3,
  weeklyLimit: null,
};

// Việt Nam cố định UTC+7 — dùng để tính mốc "hôm nay/tuần này" theo giờ VN.
export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mốc đầu ngày & đầu tuần theo giờ VN, quy về Date (UTC) để so với createdAt đã lưu UTC.
 * Tuần bắt đầu từ Thứ Hai 00:00 (giờ VN).
 */
export function vnPeriodStarts(now = new Date()): {
  startOfDay: Date;
  startOfWeek: Date;
} {
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const startOfDay = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()) -
      VN_OFFSET_MS,
  );
  // getUTCDay: 0 = CN … 6 = T7 → số ngày đã trôi qua kể từ Thứ Hai.
  const daysSinceMonday = (vnNow.getUTCDay() + 6) % 7;
  const startOfWeek = new Date(startOfDay.getTime() - daysSinceMonday * DAY_MS);
  return { startOfDay, startOfWeek };
}
