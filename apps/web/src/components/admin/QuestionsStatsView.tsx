"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  getTopicQuestionCounts,
  getTopRecordedQuestions,
  type TopRecordedQuestion,
} from "@/lib/api/questions";
import { getTopics } from "@/lib/api/topics";
import { LEVEL_STYLE } from "@/lib/utils/levels";

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

interface TopicSlice {
  name: string;
  value: number;
}

export default function QuestionsStatsView() {
  const [slices, setSlices] = useState<TopicSlice[] | null>(null);
  const [top, setTop] = useState<TopRecordedQuestion[] | null>(null);

  useEffect(() => {
    Promise.all([getTopicQuestionCounts(), getTopics()])
      .then(([counts, topics]) => {
        const nameById = new Map(topics.map((t) => [t.id, t.name]));
        setSlices(
          Object.entries(counts)
            .map(([topicId, value]) => ({
              name: nameById.get(topicId) ?? "—",
              value,
            }))
            .sort((a, b) => b.value - a.value),
        );
      })
      .catch(() => setSlices([]));

    getTopRecordedQuestions(10)
      .then(setTop)
      .catch(() => setTop([]));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-bold text-text-primary">
          Câu hỏi theo chủ đề
        </h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Phân bổ ngân hàng câu hỏi theo từng topic
        </p>

        <div className="mt-5">
          {!slices ? (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : slices.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">
              Chưa có câu hỏi nào.
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

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-text-primary">
            Top 10 câu hỏi được ghi âm nhiều nhất
          </h3>
        </div>

        <div className="grid grid-cols-[40px_1fr_140px_90px_90px] gap-4 px-5 py-3 border-b border-border text-xs font-medium uppercase tracking-wider text-text-muted">
          <span>#</span>
          <span>Nội dung</span>
          <span>Chủ đề</span>
          <span>Cấp độ</span>
          <span className="text-right">Lượt ghi âm</span>
        </div>

        {!top ? (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : top.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Mic size={22} className="text-text-muted" />
            <p className="text-sm text-text-muted">
              Chưa có lượt ghi âm nào.
            </p>
          </div>
        ) : (
          top.map((q, i) => {
            const levelStyle = LEVEL_STYLE[q.level];
            return (
              <div
                key={q.id}
                className="grid grid-cols-[40px_1fr_140px_90px_90px] gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center hover:bg-elevated transition-colors duration-150"
              >
                <span className="font-mono text-xs text-text-muted">
                  {i + 1}
                </span>
                <span className="text-sm text-text-primary truncate" title={q.content}>
                  {q.content}
                </span>
                <span className="text-sm text-text-secondary truncate">
                  {q.topic?.name ?? "—"}
                </span>
                <span
                  className={`self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md w-fit ${levelStyle.className}`}
                >
                  {levelStyle.label}
                </span>
                <span className="text-sm text-text-primary text-right font-semibold">
                  {q.sessionCount}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
