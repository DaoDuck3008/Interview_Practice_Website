import api, { type ApiResponse } from "./api";

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "CANCELED"
  | "FAILED";

export interface CheckoutOrder {
  id: string;
  status: OrderStatus;
  amountVnd: number;
  transferCode: string;
  expiresAt: string;
  plan: { slug: string; name: string; durationDays: number };
  qrUrl: string;
  bankAccount: string;
  bankCode: string;
  accountName: string;
}

/** Tạo (hoặc tái dùng) đơn cho 1 gói → trả về thông tin thanh toán + QR. */
export async function createCheckout(planSlug: string): Promise<CheckoutOrder> {
  const res = await api.post<ApiResponse<CheckoutOrder>>(
    "/payments/checkout",
    { planSlug },
  );
  return res.data.data;
}

/** Lấy trạng thái đơn (dùng để poll). */
export async function getOrder(id: string): Promise<CheckoutOrder> {
  const res = await api.get<ApiResponse<CheckoutOrder>>(
    `/payments/orders/${id}`,
  );
  return res.data.data;
}
