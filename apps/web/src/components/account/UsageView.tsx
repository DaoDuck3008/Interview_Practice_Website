"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Gauge,
  Infinity as InfinityIcon,
  Sparkles,
  Sun,
} from "lucide-react";
import { getQuotaStatus, type QuotaStatus } from "@/lib/api/quota";
import { getMySubscription, type MySubscription } from "@/lib/api/subscriptions";
import { formatNumber } from "@/lib/utils/format";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

export default function UsageView() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getQuotaStatus(), getMySubscription()])
      .then(([q, s]) => {
        setStatus(q);
        setSub(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-6">
        <div className={`${cardClass} animate-pulse h-28`} style={cardBg} />
        <div className={`${cardClass} animate-pulse h-64`} style={cardBg} />
      </div>
    );
  }

  const planName = sub?.isActive ? sub.plan.name : "Gói Free";
  const unlimited = status?.unlimited ?? false;

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <div className={cardClass} style={cardBg}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Mức sử dụng
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-[var(--color-text-primary)]">
              Lượt luyện tập
            </h2>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Gauge size={13} />
            {planName}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Mỗi lần luyện tập (ghi âm + phiên âm) tính là một lượt. Hạn mức tự đặt
          lại theo chu kỳ bên dưới.
        </p>
      </div>

      {/* Bars / unlimited */}
      {unlimited ? (
        <UnlimitedCard />
      ) : (
        <div className={`${cardClass} flex flex-col gap-8`} style={cardBg}>
          {status?.daily && (
            <UsageBar
              icon={Sun}
              label="Hôm nay"
              reset="Đặt lại lúc 00:00 mỗi ngày (giờ VN)"
              used={status.daily.used}
              limit={status.daily.limit}
            />
          )}
          {status?.weekly && (
            <UsageBar
              icon={CalendarDays}
              label="Tuần này"
              reset="Đặt lại vào Thứ Hai hằng tuần (giờ VN)"
              used={status.weekly.used}
              limit={status.weekly.limit}
            />
          )}
          {!status?.daily && !status?.weekly && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Gói của bạn không giới hạn số lượt luyện tập.
            </p>
          )}

          {!sub?.isActive && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Nâng cấp để luyện tập nhiều hơn mỗi ngày.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)]"
              >
                <Sparkles size={15} />
                Xem bảng giá
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UsageBar({
  icon: Icon,
  label,
  reset,
  used,
  limit,
}: {
  icon: typeof Sun;
  label: string;
  reset: string;
  used: number;
  limit: number;
}) {
  const remaining = Math.max(0, limit - used);
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  const exhausted = remaining === 0;
  // Màu thanh tính theo runtime (theo tỷ lệ) nên dùng inline style:
  // còn nhiều → tím accent, gần hết → vàng, hết → đỏ.
  const fillColor = exhausted
    ? "#ef4444"
    : ratio >= 0.8
      ? "#f59e0b"
      : "var(--color-accent)";

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <Icon size={15} className="text-[var(--color-text-muted)]" />
          {label}
        </span>
        <span className="text-sm text-[var(--color-text-secondary)]">
          <span className="font-bold text-[var(--color-text-primary)]">
            {formatNumber(used)}
          </span>
          {" / "}
          {formatNumber(limit)} lượt
        </span>
      </div>

      <div
        className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${label}: ${used} trên ${limit} lượt`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${ratio * 100}%`, background: fillColor }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">{reset}</span>
        <span
          className="text-xs font-medium"
          style={{ color: exhausted ? "#ef4444" : "var(--color-text-secondary)" }}
        >
          {exhausted ? "Đã hết lượt" : `Còn ${formatNumber(remaining)} lượt`}
        </span>
      </div>
    </div>
  );
}

function UnlimitedCard() {
  return (
    <div className={`${cardClass} flex items-center gap-4`} style={cardBg}>
      <span
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgba(124,58,237,0.14)" }}
      >
        <InfinityIcon size={22} className="text-[var(--color-accent-light)]" />
      </span>
      <div>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Không giới hạn
        </h3>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          Gói của bạn cho phép luyện tập không giới hạn số lượt. Cứ thoải mái
          luyện nhé!
        </p>
      </div>
    </div>
  );
}
