"use client";

import { useEffect, useState } from "react";
import { getUserStats, type UserStats } from "@/lib/api/users";
import { formatNumber } from "@/lib/utils/format";
import UserRegistrationsChart from "./UserRegistrationsChart";

export default function UserStatsView() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const cards = [
    { label: "Tổng người dùng", value: stats?.total },
    { label: "Mới hôm nay", value: stats?.newToday },
    { label: "Mới tuần này", value: stats?.newWeek },
    { label: "Mới tháng này", value: stats?.newMonth },
    { label: "Đã khóa", value: stats?.locked },
    {
      label: "Google / Local",
      value: stats ? `${stats.googleCount} / ${stats.localCount}` : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <p className="text-xs text-text-muted mb-1">{label}</p>
            {value !== undefined ? (
              <p className="text-xl font-bold text-text-primary">
                {typeof value === "number" ? formatNumber(value) : value}
              </p>
            ) : (
              <div className="h-7 w-16 rounded bg-elevated animate-pulse" />
            )}
          </div>
        ))}
      </div>

      <UserRegistrationsChart />
    </div>
  );
}
