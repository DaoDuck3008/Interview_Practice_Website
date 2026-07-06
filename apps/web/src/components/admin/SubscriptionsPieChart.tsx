"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getSubscriptionStats } from "@/lib/api/subscriptions";

const PALETTE = [
  "#7c3aed",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#a78bfa",
  "#84cc16",
  "#f472b6",
];

interface PlanSlice {
  name: string;
  value: number;
}

export default function SubscriptionsPieChart() {
  const [slices, setSlices] = useState<PlanSlice[] | null>(null);

  useEffect(() => {
    getSubscriptionStats()
      .then((stats) =>
        setSlices(
          stats.byPlan.map((p) => ({ name: p.planName, value: p.count })),
        ),
      )
      .catch(() => setSlices([]));
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Gói đã đăng ký
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Phân bổ subscription theo từng gói
          </p>
        </div>
        <Link
          href="/admin/subscriptions"
          className="flex items-center gap-1 text-xs font-medium text-accent-light hover:underline flex-shrink-0"
        >
          Xem chi tiết
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mt-5">
        {!slices ? (
          <div className="h-[320px] rounded-lg bg-elevated animate-pulse" />
        ) : slices.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-muted">
            Chưa có gói đăng ký nào.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
              >
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#13131c",
                  border: "1px solid #1c1c28",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#f4f4f6" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#9898aa" }}
                layout="vertical"
                verticalAlign="middle"
                align="right"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
