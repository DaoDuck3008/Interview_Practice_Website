"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import { getOrderAdmin, type AdminOrderDetail } from "@/lib/api/payments";
import { formatDateTime, formatDay, formatVnd } from "@/lib/utils/format";
import { ORDER_STATUS_META } from "@/lib/utils/subscriptions";

interface Props {
  /** Id đơn đang xem; null = đóng modal. */
  orderId: string | null;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5">
      <span className="text-xs text-[#606072]">{label}</span>
      <span className="text-sm text-[#f4f4f6] break-words">{children}</span>
    </div>
  );
}

export default function OrderDetailModal({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    setLoading(true);
    setError(false);
    setOrder(null);
    getOrderAdmin(orderId)
      .then((data) => active && setOrder(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [orderId]);

  const meta = order ? ORDER_STATUS_META[order.status] : null;

  return (
    <Modal open={orderId !== null} onClose={onClose} title="Chi tiết giao dịch">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#606072]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center py-12 text-sm text-[#ef4444]">
          Không tải được chi tiết đơn.
        </p>
      ) : order && meta ? (
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-lg font-semibold text-[#f4f4f6]">
                {formatVnd(order.amountVnd)}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  background: `${meta.color}1a`,
                  color: meta.color,
                  border: `1px solid ${meta.color}4d`,
                }}
              >
                {meta.label}
              </span>
            </div>

            <Row label="Người dùng">
              {order.user.name}
              <span className="text-[#606072]"> · {order.user.email}</span>
            </Row>
            <Row label="Gói">
              {order.plan.name}{" "}
              <span className="text-[#606072]">
                ({order.plan.durationDays} ngày)
              </span>
            </Row>
            <Row label="Mã đơn (nội dung)">
              <span className="font-mono">{order.transferCode}</span>
            </Row>
            <Row label="Mã GD Sepay">
              <span className="font-mono">{order.providerTxnId ?? "—"}</span>
            </Row>
            <Row label="Nhà cung cấp">{order.provider}</Row>
            <Row label="Tạo lúc">{formatDateTime(order.createdAt)}</Row>
            <Row label="Thanh toán">{formatDateTime(order.paidAt)}</Row>
            <Row label="QR hết hạn">{formatDateTime(order.expiresAt)}</Row>
            <Row label="Hiệu lực tới">{formatDay(order.periodEnd)}</Row>
            <Row label="Subscription">
              {order.subscription ? (
                <>
                  {order.subscription.status}
                  <span className="text-[#606072]">
                    {" "}
                    · hết hạn {formatDay(order.subscription.expiresAt)}
                  </span>
                </>
              ) : (
                "—"
              )}
            </Row>
            {order.grantedBy && (
              <Row label="Cấp bởi">
                {order.grantedBy.name}
                <span className="text-[#606072]">
                  {" "}
                  · {order.grantedBy.email}
                </span>
              </Row>
            )}
            {order.note && <Row label="Lý do">{order.note}</Row>}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#606072] mb-1.5">
              rawPayload (webhook Sepay)
            </p>
            <pre className="text-xs text-[#9898aa] bg-[#06060c] border border-[#1c1c28] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {order.rawPayload
                ? JSON.stringify(order.rawPayload, null, 2)
                : "— (chưa có payload — đơn chưa nhận được webhook)"}
            </pre>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
