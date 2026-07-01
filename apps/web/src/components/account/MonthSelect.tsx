"use client";

import { ChevronDown } from "lucide-react";

/** Danh sách `count` tháng gần nhất (mới nhất trước) dạng { 'YYYY-MM', 'Tháng M/YYYY' }. */
export function buildMonthOptions(
  count = 12,
): { value: string; label: string }[] {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    opts.push({
      value: `${y}-${String(m).padStart(2, "0")}`,
      label: `Tháng ${m}/${y}`,
    });
  }
  return opts;
}

/** Tháng hiện tại dạng 'YYYY-MM' (theo lịch máy người dùng). */
export function currentMonth(): string {
  return buildMonthOptions(1)[0].value;
}

export default function MonthSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = buildMonthOptions();

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-[var(--color-border)] py-1.5 pl-3 pr-8 text-xs font-medium text-[var(--color-text-primary)] outline-none cursor-pointer focus:border-[var(--color-accent)]"
        style={{ background: "var(--color-elevated)" }}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: "var(--color-elevated)" }}
          >
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
    </div>
  );
}
