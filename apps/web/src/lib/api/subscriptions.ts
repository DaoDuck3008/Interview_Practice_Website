import api, { type ApiResponse } from "./api";

export interface MySubscription {
  status: "ACTIVE" | "EXPIRED" | "CANCELED";
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
