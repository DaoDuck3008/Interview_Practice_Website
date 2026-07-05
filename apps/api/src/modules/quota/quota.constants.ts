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
