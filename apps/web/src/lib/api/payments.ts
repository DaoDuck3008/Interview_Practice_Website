import api, { type ApiResponse } from "./api";
import type { Paginated } from "./questions";

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

export interface PaidOrder {
  id: string;
  amountVnd: number;
  paidAt: string | null;
  periodEnd: string | null;
  plan: { name: string; slug: string; durationDays: number };
}

/** Lịch sử đơn đã thanh toán. Lỗi → [] để UI không vỡ. */
export async function getPaidOrders(): Promise<PaidOrder[]> {
  try {
    const res = await api.get<ApiResponse<PaidOrder[]>>("/payments/orders");
    return res.data.data;
  } catch {
    return [];
  }
}

// ─── Admin: sổ cái giao dịch ─────────────────────────

export type OrderDateField = "createdAt" | "paidAt";

/** Một dòng đơn trong sổ cái admin. */
export interface AdminOrder {
  id: string;
  amountVnd: number;
  status: OrderStatus;
  provider: string;
  transferCode: string;
  providerTxnId: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  plan: { name: string; slug: string };
}

/** Chi tiết đơn (đối soát) — gồm rawPayload + subscription liên quan. */
export interface AdminOrderDetail {
  id: string;
  amountVnd: number;
  status: OrderStatus;
  provider: string;
  transferCode: string;
  providerTxnId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  periodEnd: string | null;
  subscriptionId: string | null;
  rawPayload: unknown;
  user: { id: string; name: string; email: string };
  plan: { name: string; slug: string; durationDays: number };
  subscription: { id: string; status: string; expiresAt: string } | null;
}

export interface OrderStats {
  revenueTotal: number;
  revenueMonth: number;
  revenueToday: number;
  counts: Partial<Record<OrderStatus, number>>;
}

export interface AdminOrderQuery {
  status?: OrderStatus;
  search?: string;
  dateField?: OrderDateField;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

function toParams(query: AdminOrderQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params[key] = value;
  }
  return params;
}

/** Sổ cái đơn (admin) — phân trang + lọc. */
export async function getOrdersAdmin(
  query: AdminOrderQuery = {},
): Promise<Paginated<AdminOrder>> {
  const res = await api.get<ApiResponse<Paginated<AdminOrder>>>(
    "/payments/admin/orders",
    { params: toParams(query) },
  );
  return res.data.data;
}

/** Thẻ thống kê doanh thu + đếm theo trạng thái. */
export async function getOrderStats(): Promise<OrderStats> {
  const res = await api.get<ApiResponse<OrderStats>>(
    "/payments/admin/orders/stats",
  );
  return res.data.data;
}

/** Toàn bộ đơn khớp bộ lọc (không phân trang) để xuất CSV. */
export async function getOrdersForExport(
  query: AdminOrderQuery = {},
): Promise<AdminOrder[]> {
  const res = await api.get<ApiResponse<AdminOrder[]>>(
    "/payments/admin/orders/export",
    { params: toParams(query) },
  );
  return res.data.data;
}

/** Chi tiết 1 đơn (admin). */
export async function getOrderAdmin(id: string): Promise<AdminOrderDetail> {
  const res = await api.get<ApiResponse<AdminOrderDetail>>(
    `/payments/admin/orders/${id}`,
  );
  return res.data.data;
}

// ─── Admin: đối soát ngân hàng (Sepay) ───────────────

export interface ReconcileOrderRef {
  id: string;
  transferCode: string;
  amountVnd: number;
  status: OrderStatus;
  user: { name: string; email: string };
  plan: { name: string };
}

/** Một giao dịch ngân hàng (Sepay) trong kết quả đối soát. */
export interface ReconcileTxn {
  txnId: string;
  date: string;
  amountIn: number;
  content: string | null;
  referenceNumber: string | null;
  code: string | null;
  bankBrand: string | null;
}

export type ReconcileMatched = ReconcileTxn & { order: ReconcileOrderRef };
export type ReconcileMismatch = ReconcileMatched & { reason: string };

export interface ReconcileResult {
  from: string;
  to: string;
  summary: {
    total: number;
    matched: number;
    mismatch: number;
    orphan: number;
    totalAmountIn: number;
  };
  matched: ReconcileMatched[];
  mismatch: ReconcileMismatch[];
  orphan: ReconcileTxn[];
}

/** Tab đối soát có khả dụng không (đã cấu hình Sepay API key chưa). */
export async function getReconcileConfig(): Promise<{ configured: boolean }> {
  const res = await api.get<ApiResponse<{ configured: boolean }>>(
    "/payments/admin/reconcile/config",
  );
  return res.data.data;
}

/** Đối soát giao dịch ngân hàng với bảng Order theo khoảng ngày (YYYY-MM-DD). */
export async function reconcile(
  from: string,
  to: string,
): Promise<ReconcileResult> {
  const res = await api.get<ApiResponse<ReconcileResult>>(
    "/payments/admin/reconcile",
    { params: { from, to } },
  );
  return res.data.data;
}
