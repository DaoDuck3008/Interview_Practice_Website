import api, { type ApiResponse } from "./api";
import type { Paginated } from "./questions";
import type { SubscriptionStatus } from "./subscriptions";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  isLock: boolean;
  isGoogle: boolean;
  createdAt: string;
  subscription: {
    status: SubscriptionStatus;
    expiresAt: string;
    planName: string;
  } | null;
}

export interface AdminUserQuery {
  search?: string;
  /** slug của gói, hoặc 'free' cho user chưa có gói. */
  plan?: string;
  verified?: "true" | "false";
  locked?: "true" | "false";
  sort?: "name" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/** Danh sách user (admin) — phân trang + lọc + sắp xếp, kèm tóm tắt gói hiện tại. */
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

/** Khóa / mở khóa tài khoản. */
export async function setUserLock(
  id: string,
  isLock: boolean,
): Promise<{ id: string; isLock: boolean }> {
  const res = await api.patch<ApiResponse<{ id: string; isLock: boolean }>>(
    `/users/admin/${id}/lock`,
    { isLock },
  );
  return res.data.data;
}

/** Xác thực email thủ công cho user. */
export async function verifyUserManually(
  id: string,
): Promise<{ id: string; emailVerified: boolean }> {
  const res = await api.patch<
    ApiResponse<{ id: string; emailVerified: boolean }>
  >(`/users/admin/${id}/verify`);
  return res.data.data;
}

/** Reset mật khẩu hộ user (gửi mật khẩu tạm qua email). */
export async function resetUserPassword(
  id: string,
): Promise<{ id: string; message: string }> {
  const res = await api.post<ApiResponse<{ id: string; message: string }>>(
    `/users/admin/${id}/reset-password`,
  );
  return res.data.data;
}
