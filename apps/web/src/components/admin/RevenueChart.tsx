"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight } from "lucide-react";
import { getRevenueDaily, type RevenuePoint } from "@/lib/api/payments";
import { formatDay, formatVnd, formatNumber } from "@/lib/utils/format";

export default function RevenueChart({
  detailHref,
}: {
  detailHref?: string;
} = {}) {
  const [data, setData] = useState<RevenuePoint[] | null>(null);

  useEffect(() => {
    getRevenueDaily()
      .then(setData)
      .catch(() => setData([]));
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Doanh thu theo ngày
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">30 ngày gần nhất</p>
        </div>
        {detailHref && (
          <Link
            href={detailHref}
            className="flex items-center gap-1 text-xs font-medium text-accent-light hover:underline flex-shrink-0"
          >
            Xem chi tiết
            <ArrowRight size={12} />
          </Link>
        )}
      </div>

      <div className="mt-5">
        {!data ? (
          <div className="h-[280px] rounded-lg bg-elevated animate-pulse" />
        ) : data.every((d) => d.revenue === 0) ? (
          <p className="py-24 text-center text-sm text-text-muted">
            Chưa có doanh thu trong 30 ngày gần nhất.
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
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
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
                    tickFormatter={(v: number) => formatNumber(v)}
                    tick={{ fill: "#9898aa", fontSize: 11 }}
                    stroke="rgba(255,255,255,0.1)"
                    width={64}
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
                    formatter={(value) => [formatVnd(Number(value)), "Doanh thu"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
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
