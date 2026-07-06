"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import {
  getActiveUsersDaily,
  type ActiveUserPoint,
} from "@/lib/api/sessions";
import { formatDay } from "@/lib/utils/format";

export default function ActiveUsersChart() {
  const [data, setData] = useState<ActiveUserPoint[] | null>(null);

  useEffect(() => {
    getActiveUsersDaily()
      .then(setData)
      .catch(() => setData([]));
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-lg font-bold text-text-primary">
        User hoạt động theo ngày
      </h3>
      <p className="mt-0.5 text-xs text-text-muted">30 ngày gần nhất</p>

      <div className="mt-5">
        {!data ? (
          <div className="flex items-center justify-center py-24 text-text-muted">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : data.every((d) => d.count === 0) ? (
          <p className="py-24 text-center text-sm text-text-muted">
            Chưa có hoạt động luyện tập trong 30 ngày gần nhất.
          </p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[560px]">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={data}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(8)}
                    tick={{ fill: "#9898aa", fontSize: 11 }}
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#9898aa", fontSize: 11 }}
                    stroke="rgba(255,255,255,0.1)"
                    width={32}
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
                    formatter={(value) => [Number(value), "User hoạt động"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#activeFill)"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
