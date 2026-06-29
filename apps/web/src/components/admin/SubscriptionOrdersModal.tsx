"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import {
  getSubscriptionOrders,
  type AdminSubscription,
  type SubscriptionOrder,
} from "@/lib/api/subscriptions";
import { formatDateTime, formatDay, formatVnd } from "@/lib/utils/format";
import { ORDER_STATUS_META } from "@/lib/utils/subscriptions";

interface Props {
  /** Subscription đang xem; null = đóng modal. */
  subscription: AdminSubscription | null;
  onClose: () => void;
}

export default function SubscriptionOrdersModal({
  subscription,
  onClose,
}: Props) {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const id = subscription?.id;

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(false);
    getSubscriptionOrders(id)
      .then((data) => active && setOrders(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Modal
      open={subscription !== null}
      onClose={onClose}
      title="Lịch sử giao dịch"
    >
      {subscription && (
        <p className="text-sm text-[#9898aa] -mt-2 mb-4">
          {subscription.user.name} · {subscription.plan.name}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#606072]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center py-12 text-sm text-[#ef4444]">
          Không tải được lịch sử giao dịch.
        </p>
      ) : orders.length === 0 ? (
        <p className="text-center py-12 text-sm text-[#606072]">
          Chưa có giao dịch nào cho gói này.
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {orders.map((o) => {
            const meta = ORDER_STATUS_META[o.status];
            return (
              <div
                key={o.id}
                className="rounded-lg border border-[#1c1c28] bg-[#0d0d14] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#f4f4f6]">
                    {formatVnd(o.amountVnd)}
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
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#606072]">
                  <span>
                    Tạo lúc:{" "}
                    <span className="text-[#9898aa]">
                      {formatDateTime(o.createdAt)}
                    </span>
                  </span>
                  <span>
                    Thanh toán:{" "}
                    <span className="text-[#9898aa]">
                      {formatDateTime(o.paidAt)}
                    </span>
                  </span>
                  <span>
                    Hết hạn tới:{" "}
                    <span className="text-[#9898aa]">
                      {formatDay(o.periodEnd)}
                    </span>
                  </span>
                  <span>
                    Mã GD:{" "}
                    <span className="text-[#9898aa] font-mono">
                      {o.transferCode}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
