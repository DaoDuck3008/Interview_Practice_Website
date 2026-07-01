"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  Clock,
  RefreshCw,
  Repeat,
  Sparkles,
} from "lucide-react";
import {
  getMySubscription,
  type MySubscription,
} from "@/lib/api/subscriptions";
import { getPaidOrders, type PaidOrder } from "@/lib/api/payments";
import { formatDay, formatVnd } from "@/lib/utils/format";

const DAY_MS = 24 * 60 * 60 * 1000;

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

// Ngày hết hạn của đơn: ưu tiên snapshot periodEnd; đơn cũ chưa có thì suy ra từ ngày mua + kỳ hạn.
function orderEndDay(o: PaidOrder) {
  if (o.periodEnd) return formatDay(o.periodEnd);
  if (o.paidAt)
    return formatDay(
      new Date(
        new Date(o.paidAt).getTime() + o.plan.durationDays * DAY_MS,
      ).toISOString(),
    );
  return "—";
}

export default function BillingView() {
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [orders, setOrders] = useState<PaidOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMySubscription(), getPaidOrders()])
      .then(([s, o]) => {
        setSub(s);
        setOrders(o);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-6">
        <div className={`${cardClass} animate-pulse h-44`} style={cardBg} />
        <div className={`${cardClass} animate-pulse h-56`} style={cardBg} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <CurrentPlanCard sub={sub} />
      <HistoryCard orders={orders} />
    </div>
  );
}

function CurrentPlanCard({ sub }: { sub: MySubscription | null }) {
  // Chưa từng mua gói
  if (!sub) {
    return (
      <div className={cardClass} style={cardBg}>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          Gói hiện tại
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Bạn chưa đăng ký gói nào. Nâng cấp để mở khóa chấm điểm AI không giới
          hạn và theo dõi tiến bộ.
        </p>
        <Link
          href="/pricing"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)]"
        >
          <Sparkles size={15} />
          Xem bảng giá
        </Link>
      </div>
    );
  }

  const remainingDays = Math.max(
    0,
    Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / DAY_MS),
  );
  const expiryStr = formatDay(sub.expiresAt);

  return (
    <div className={cardClass} style={cardBg}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Gói hiện tại
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-[var(--color-text-primary)]">
            {sub.plan.name}
          </h2>
        </div>
        {sub.isActive ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-success)]"
            style={{ background: "rgba(34,197,94,0.12)" }}
          >
            <BadgeCheck size={13} />
            Đang sử dụng
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Clock size={13} />
            Hết hạn
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        {sub.isActive ? (
          <p className="text-[var(--color-text-secondary)]">
            Còn{" "}
            <span className="font-bold text-[var(--color-text-primary)]">
              {remainingDays}
            </span>{" "}
            ngày · hết hạn {expiryStr}
          </p>
        ) : (
          <p className="text-[var(--color-text-secondary)]">
            Đã hết hạn ngày {expiryStr}. Gia hạn để tiếp tục sử dụng.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)]"
        >
          <RefreshCw size={15} />
          Gia hạn
        </Link>
        {sub.isActive && (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent-light)]"
          >
            <Repeat size={15} />
            Đổi gói
          </Link>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ orders }: { orders: PaidOrder[] }) {
  return (
    <div className={cardClass} style={cardBg}>
      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
        Lịch sử mua
      </h2>

      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Chưa có giao dịch nào.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 py-3.5 last:border-b-0 text-sm"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-[var(--color-text-primary)] truncate">
                  {o.plan.name}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                  {o.plan.durationDays} ngày
                </span>
              </span>

              <span className="ml-auto font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                {formatVnd(o.amountVnd)}
              </span>

              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                <CalendarCheck
                  size={13}
                  className="text-[var(--color-text-muted)]"
                />
                Mua: {formatDay(o.paidAt)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                <CalendarClock
                  size={13}
                  className="text-[var(--color-text-muted)]"
                />
                Hết hạn: {orderEndDay(o)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
