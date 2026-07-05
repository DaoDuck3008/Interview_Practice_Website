"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Clock, Star, Sparkles } from "lucide-react";
import {
  getMyStats,
  getMyMonthly,
  getMyHeatmap,
  type DashboardStats,
  type MonthlyData,
  type HeatmapData,
} from "@/lib/api/sessions";
import { formatNumber, formatHoursMinutes } from "@/lib/utils/format";
import StatCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import ActivityHeatmap from "./ActivityHeatmap";
import ProgressChart from "./ProgressChart";
import PracticeHistoryList from "./PracticeHistoryList";
import { currentMonth } from "./MonthSelect";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

export default function OverviewView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [month, setMonth] = useState(currentMonth());
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);

  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  useEffect(() => {
    getMyStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));

    getMyHeatmap()
      .then(setHeatmap)
      .catch(() => setHeatmap(null))
      .finally(() => setHeatmapLoading(false));
  }, []);

  useEffect(() => {
    setMonthlyLoading(true);
    getMyMonthly(month)
      .then(setMonthly)
      .catch(() => setMonthly(null))
      .finally(() => setMonthlyLoading(false));
  }, [month]);

  const avgOverall =
    stats && stats.scoredCount > 0
      ? Math.round(
          ((stats.avgTechnical + stats.avgCompleteness + stats.avgClarity) /
            3) *
            10,
        ) / 10
      : null;

  if (!statsLoading && stats && stats.totalSessions === 0) {
    return (
      <div className={cardClass} style={cardBg}>
        <EmptyState
          icon={Sparkles}
          title="Bắt đầu hành trình luyện tập của bạn"
          description="Bạn chưa có buổi luyện tập nào. Chọn một câu hỏi và ghi âm câu trả lời đầu tiên để bắt đầu theo dõi tiến độ tại đây."
          action={{ label: "Khám phá câu hỏi", href: "/learning" }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Thẻ số liệu */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={`${cardClass} animate-pulse h-28`} style={cardBg} />
          <div className={`${cardClass} animate-pulse h-28`} style={cardBg} />
          <div className={`${cardClass} animate-pulse h-28`} style={cardBg} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={Dumbbell}
            label="Tổng lượt luyện"
            value={formatNumber(stats?.totalSessions ?? 0)}
            hint="Câu hỏi đã luyện"
          />
          <StatCard
            icon={Clock}
            label="Thời gian luyện"
            value={formatHoursMinutes(stats?.totalDurationSeconds ?? 0)}
            hint="Trong tháng qua"
          />
          <StatCard
            icon={Star}
            label="Điểm trung bình"
            value={avgOverall !== null ? `${avgOverall}/10` : "—"}
            hint={
              avgOverall !== null
                ? `KT ${stats?.avgTechnical} · ĐĐ ${stats?.avgCompleteness} · RR ${stats?.avgClarity}`
                : "Chưa có buổi nào được chấm"
            }
          />
        </div>
      )}

      <ActivityHeatmap
        data={heatmap?.days ?? []}
        from={heatmap?.from}
        to={heatmap?.to}
        loading={heatmapLoading}
      />

      <ProgressChart
        data={monthly?.progress ?? []}
        month={month}
        onMonthChange={setMonth}
        loading={monthlyLoading}
      />

      <PracticeHistoryList />
    </div>
  );
}
