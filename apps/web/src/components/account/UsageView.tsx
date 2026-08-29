"use client";

import Link from "next/link";
import { CalendarClock, Gauge, LockKeyhole, Sparkles } from "lucide-react";
import { useAiCredits } from "@/hooks/useAiCredits";
import { formatDate, formatNumber } from "@/lib/utils/format";

const cardClass = "rounded-2xl border border-border bg-surface p-6 md:p-8";

export default function UsageView() {
  const { balance, balanceLoading } = useAiCredits({ loadBalance: true });

  if (balanceLoading && !balance) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className={`${cardClass} h-28 animate-pulse`} />
        <div className={`${cardClass} h-64 animate-pulse`} />
      </div>
    );
  }

  if (!balance) {
    return (
      <div className={`${cardClass} flex-1`}>
        <h2 className="text-xl font-bold text-text-primary">
          Chưa thể tải số dư AI credits
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Vui lòng tải lại trang sau ít phút.
        </p>
      </div>
    );
  }

  const committed = balance.used + balance.reserved;
  const ratio =
    balance.granted > 0 ? Math.min(1, committed / balance.granted) : 0;
  const isFree = balance.source === "FREE";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Mức sử dụng
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-text-primary">
              AI credits
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-text-secondary">
            <Gauge size={13} />
            {balance.planName ?? "Gói Free"}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          Credits được dùng cho ghi âm và chấm câu trả lời, cải thiện câu trả
          lời, phân tích CV và các bản tổng kết bằng AI.
        </p>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary">
              Có thể sử dụng
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-text-primary">
              {formatNumber(balance.available)}
              <span className="ml-2 text-[16px] font-semibold text-text-muted">
                / {formatNumber(balance.granted)} credits
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-elevated px-3 py-1.5 text-text-secondary">
              Đã dùng {formatNumber(balance.used)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-text-secondary">
              <LockKeyhole size={12} />
              Đang giữ {formatNumber(balance.reserved)}
            </span>
          </div>
        </div>

        <div
          className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-elevated"
          role="progressbar"
          aria-valuenow={committed}
          aria-valuemin={0}
          aria-valuemax={balance.granted}
          aria-label={`${committed} trên ${balance.granted} AI credits đã dùng hoặc đang được giữ`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="inline-flex items-center gap-2 text-xs text-text-muted">
            <CalendarClock size={14} />
            {isFree ? "Làm mới vào" : "Chu kỳ kết thúc vào"}{" "}
            {formatDate(balance.cycleEndsAt)}
          </p>
          {isFree && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
            >
              <Sparkles size={15} />
              Xem các gói credit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
