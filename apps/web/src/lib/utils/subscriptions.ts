import type { SubscriptionStatus, OrderStatus } from "@/lib/api/subscriptions";

/** Nhãn + màu badge cho trạng thái subscription (dùng ở các trang admin). */
export const SUBSCRIPTION_STATUS_META: Record<
  SubscriptionStatus,
  { label: string; color: string }
> = {
  ACTIVE: { label: "Đang dùng", color: "#22c55e" },
  EXPIRED: { label: "Hết hạn", color: "#606072" },
  CANCELED: { label: "Đã hủy", color: "#ef4444" },
};

/** Nhãn + màu badge cho trạng thái đơn hàng (dùng ở các trang admin). */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; color: string }
> = {
  PAID: { label: "Đã trả", color: "#22c55e" },
  PENDING: { label: "Chờ trả", color: "#f59e0b" },
  EXPIRED: { label: "Hết hạn", color: "#606072" },
  CANCELED: { label: "Đã hủy", color: "#606072" },
  FAILED: { label: "Thất bại", color: "#ef4444" },
};
