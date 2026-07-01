"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressPoint } from "@/lib/api/sessions";
import { formatDay } from "@/lib/utils/format";
import MonthSelect from "./MonthSelect";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

const SERIES = [
  { key: "technical", name: "Kỹ thuật", color: "#7c3aed" },
  { key: "completeness", name: "Đầy đủ", color: "#22c55e" },
  { key: "clarity", name: "Rõ ràng", color: "#f59e0b" },
] as const;

interface Props {
  data: ProgressPoint[];
  month: string;
  onMonthChange: (v: string) => void;
  loading?: boolean;
}

export default function ProgressChart({
  data,
  month,
  onMonthChange,
  loading,
}: Props) {
  return (
    <div className={cardClass} style={cardBg}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
            Tiến bộ điểm số
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Điểm trung bình theo ngày (thang 0–10)
          </p>
        </div>
        <MonthSelect value={month} onChange={onMonthChange} />
      </div>

      <div className={`mt-5 ${loading ? "opacity-40" : ""}`}>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--color-text-muted)]">
            Chưa có dữ liệu điểm trong tháng này.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(8)}
                tick={{ fill: "#9898aa", fontSize: 11 }}
                stroke="rgba(255,255,255,0.1)"
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fill: "#9898aa", fontSize: 11 }}
                stroke="rgba(255,255,255,0.1)"
              />
              <Tooltip
                contentStyle={{
                  background: "#13131c",
                  border: "1px solid #1c1c28",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#f4f4f6" }}
                labelFormatter={(label) => formatDay(String(label))}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#9898aa" }}
                iconType="plainline"
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
