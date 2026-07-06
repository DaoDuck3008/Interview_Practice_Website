import api, { type ApiResponse } from "./api";
import type { Paginated } from "./questions";

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELED";

export interface MySubscription {
  status: SubscriptionStatus;
  isActive: boolean;
  startedAt: string;
  expiresAt: string;
  plan: { slug: string; name: string; durationDays: number };
}

/** Subscription hiện tại của user (null nếu chưa từng mua). Lỗi → null để UI không vỡ. */
export async function getMySubscription(): Promise<MySubscription | null> {
  try {
    const res = await api.get<ApiResponse<MySubscription | null>>(
      "/subscriptions/me",
    );
    return res.data.data;
  } catch {
    return null;
  }
}

// ─── Admin ───────────────────────────────────────────

/** Một dòng subscription trong bảng admin (kèm user + plan rút gọn). */
export interface AdminSubscription {
  id: string;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  canceledAt: string | null;
  user: { id: string; name: string; email: string };
  plan: { name: string; slug: string; durationDays: number };
}

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "CANCELED"
  | "FAILED";

/** Một đơn trong lịch sử giao dịch của subscription. */
export interface SubscriptionOrder {
  id: string;
  amountVnd: number;
  status: OrderStatus;
  provider: string;
  transferCode: string;
  paidAt: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface AdminSubscriptionQuery {
  status?: SubscriptionStatus;
  search?: string;
  startedFrom?: string;
  startedTo?: string;
  page?: number;
  limit?: number;
}

/** Danh sách subscription (admin) — phân trang + lọc. */
export async function getSubscriptionsAdmin(
  query: AdminSubscriptionQuery = {},
): Promise<Paginated<AdminSubscription>> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params[key] = value;
  }
  const res = await api.get<ApiResponse<Paginated<AdminSubscription>>>(
    "/subscriptions/all",
    { params },
  );
  return res.data.data;
}

/** Lịch sử giao dịch của một subscription (admin). */
export async function getSubscriptionOrders(
  id: string,
): Promise<SubscriptionOrder[]> {
  const res = await api.get<ApiResponse<SubscriptionOrder[]>>(
    `/subscriptions/${id}/orders`,
  );
  return res.data.data;
}

/** Hủy subscription thủ công (admin). */
export async function cancelSubscription(
  id: string,
): Promise<AdminSubscription> {
  const res = await api.patch<ApiResponse<AdminSubscription>>(
    `/subscriptions/${id}/cancel`,
  );
  return res.data.data;
}

/** Kích hoạt lại subscription đã hủy (admin). */
export async function activateSubscription(
  id: string,
): Promise<AdminSubscription> {
  const res = await api.patch<ApiResponse<AdminSubscription>>(
    `/subscriptions/${id}/activate`,
  );
  return res.data.data;
}

export interface SubscriptionStats {
  active: number;
  expired: number;
  canceled: number;
  byPlan: { planName: string; count: number }[];
}

/** Thẻ thống kê: đếm theo trạng thái + đếm theo từng gói. */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const res = await api.get<ApiResponse<SubscriptionStats>>(
    "/subscriptions/stats",
  );
  return res.data.data;
}

/** Cấp gói thủ công (admin / hỗ trợ KH). days bỏ trống → dùng kỳ hạn gói. */
export interface GrantInput {
  userId: string;
  planId: string;
  days?: number;
  note: string;
}

export async function grantSubscription(
  input: GrantInput,
): Promise<AdminSubscription> {
  const res = await api.post<ApiResponse<AdminSubscription>>(
    "/subscriptions/grant",
    input,
  );
  return res.data.data;
}
