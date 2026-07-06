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
import {
  getUserRegistrationsDaily,
  type RegistrationPoint,
} from "@/lib/api/users";
import { formatDay } from "@/lib/utils/format";

export default function UserRegistrationsChart() {
  const [data, setData] = useState<RegistrationPoint[] | null>(null);

  useEffect(() => {
    getUserRegistrationsDaily()
      .then(setData)
      .catch(() => setData([]));
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-lg font-bold text-text-primary">
        Người dùng đăng ký mới
      </h3>
      <p className="mt-0.5 text-xs text-text-muted">30 ngày gần nhất</p>

      <div className="mt-5">
        {!data ? (
          <div className="h-[280px] rounded-lg bg-elevated animate-pulse" />
        ) : data.every((d) => d.count === 0) ? (
          <p className="py-24 text-center text-sm text-text-muted">
            Chưa có người dùng mới trong 30 ngày gần nhất.
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
                    <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
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
                    formatter={(value) => [Number(value), "User mới"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#regFill)"
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
