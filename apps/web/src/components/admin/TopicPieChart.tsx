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
import { getTopicQuestionCounts } from "@/lib/api/questions";
import { getTopics } from "@/lib/api/topics";

export const PIE_PALETTE = [
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

export default function TopicPieChart({
  detailHref,
}: {
  detailHref?: string;
}) {
  const [slices, setSlices] = useState<TopicSlice[] | null>(null);

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
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Câu hỏi theo chủ đề
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Phân bổ ngân hàng câu hỏi theo từng topic
          </p>
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
        {!slices ? (
          <div className="h-[320px] rounded-lg bg-elevated animate-pulse" />
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
                  <Cell key={s.name} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
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
