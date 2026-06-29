import api, { type ApiResponse } from "./api";
import type { Paginated } from "./questions";
import type { SubscriptionStatus } from "./subscriptions";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  subscription: {
    status: SubscriptionStatus;
    expiresAt: string;
    planName: string;
  } | null;
}

export interface AdminUserQuery {
  search?: string;
  page?: number;
  limit?: number;
}

/** Danh sách user (admin) — phân trang + tìm kiếm, kèm tóm tắt gói hiện tại. */
export async function getUsersAdmin(
  query: AdminUserQuery = {},
): Promise<Paginated<AdminUser>> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params[key] = value;
  }
  const res = await api.get<ApiResponse<Paginated<AdminUser>>>("/users/admin", {
    params,
  });
  return res.data.data;
}
