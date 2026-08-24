import api, { type ApiResponse } from "./api";

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceVnd: number;
  durationDays: number;
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: "pro-1w",
    slug: "pro-1w",
    name: "Gói 1 tuần",
    description: "Dùng thử toàn bộ tính năng trong 1 tuần.",
    priceVnd: 50000,
    durationDays: 7,
  },
  {
    id: "pro-1m",
    slug: "pro-1m",
    name: "Gói 1 tháng",
    description: "Phù hợp ôn luyện trước kỳ phỏng vấn.",
    priceVnd: 89000,
    durationDays: 30,
  },
  {
    id: "pro-3m",
    slug: "pro-3m",
    name: "Gói 3 tháng",
    description: "Tiết kiệm nhất — chỉ ~85.000đ mỗi tháng.",
    priceVnd: 255000,
    durationDays: 90,
  },
];

export async function getPlans(): Promise<Plan[]> {
  try {
    const res = await api.get<ApiResponse<Plan[]>>("/plans");
    const data = res.data.data;
    return data && data.length ? data : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

// ─── Admin ───────────────────────────────────────────

/** Gói đầy đủ (admin) — gồm quota, trạng thái và số lượng đã dùng. */
export interface AdminPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceVnd: number;
  durationDays: number;
  isUnlimited: boolean;
  dailyScoreLimit: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { subscriptions: number; orders: number };
}

/** Payload tạo/sửa gói. Khi sửa truyền Partial. */
export interface PlanInput {
  slug: string;
  name: string;
  description?: string | null;
  priceVnd: number;
  durationDays: number;
  isUnlimited?: boolean;
  dailyScoreLimit?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

/** Tất cả gói (kể cả đã tắt) — yêu cầu quyền ADMIN. */
export async function getPlansAdmin(): Promise<AdminPlan[]> {
  const res = await api.get<ApiResponse<AdminPlan[]>>("/plans/all");
  return res.data.data;
}

export async function createPlan(input: PlanInput): Promise<AdminPlan> {
  const res = await api.post<ApiResponse<AdminPlan>>("/plans", input);
  return res.data.data;
}

export async function updatePlan(
  id: string,
  input: Partial<PlanInput>,
): Promise<AdminPlan> {
  const res = await api.patch<ApiResponse<AdminPlan>>(`/plans/${id}`, input);
  return res.data.data;
}

export async function deletePlan(id: string): Promise<{ id: string }> {
  const res = await api.delete<ApiResponse<{ id: string }>>(`/plans/${id}`);
  return res.data.data;
}
