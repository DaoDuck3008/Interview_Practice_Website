"use client";

import { useEffect, useState } from "react";
import { getActiveUserStats, type ActiveUserStats } from "@/lib/api/sessions";
import { formatNumber } from "@/lib/utils/format";
import ActiveUsersChart from "./ActiveUsersChart";

export default function ActiveUsersView() {
  const [stats, setStats] = useState<ActiveUserStats | null>(null);

  useEffect(() => {
    getActiveUserStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const cards = [
    { label: "DAU — hôm nay", value: stats?.dau },
    { label: "WAU — tuần này", value: stats?.wau },
    { label: "MAU — tháng này", value: stats?.mau },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <p className="text-xs text-text-muted mb-1">{label}</p>
            {value !== undefined ? (
              <p className="text-xl font-bold text-text-primary">
                {formatNumber(value ?? 0)}
              </p>
            ) : (
              <div className="h-7 w-16 rounded bg-elevated animate-pulse" />
            )}
          </div>
        ))}
      </div>

      <ActiveUsersChart />
    </div>
  );
}
