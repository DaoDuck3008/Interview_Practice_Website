"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getMyHistory, type HistoryItem } from "@/lib/api/sessions";
import type { Paginated } from "@/lib/api/questions";
import { formatDay, formatDuration } from "@/lib/utils/format";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { getPracticeQuestionHref } from "@/lib/utils/question-url";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

const LIMIT = 10;

export default function PracticeHistoryList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<HistoryItem> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      getMyHistory(page, LIMIT)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    });
  }, [page]);

  return (
    <div className={cardClass} style={cardBg}>
      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
        Lịch sử luyện tập
      </h3>

      <div className={`mt-4 ${loading ? "opacity-50" : ""}`}>
        {!data || data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
            {loading ? "Đang tải…" : "Bạn chưa có buổi luyện tập nào."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={getPracticeQuestionHref(
                    item.question.topic.slug,
                    {
                      id: item.questionId,
                      content: item.question.content,
                    },
                  )}
                  className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg py-3.5 transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-[var(--color-text-primary)]">
                      {item.question.content}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_STYLE[item.question.level].className}`}
                      >
                        {LEVEL_STYLE[item.question.level].label}
                      </span>
                      <span>{item.question.topic.name}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(item.duration)}
                      </span>
                      <span>{formatDay(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 pt-0.5">
                    {item.score ? (
                      <div className="flex items-center gap-1.5">
                        <ScoreChip label="KT" value={item.score.technicalScore} />
                        <ScoreChip
                          label="ĐĐ"
                          value={item.score.completenessScore}
                        />
                        <ScoreChip label="RR" value={item.score.clarityScore} />
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Chưa chấm
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-[var(--color-text-muted)]">
            Trang {data.page}/{data.totalPages} · {data.total} buổi
          </span>
          <div className="flex items-center gap-2">
            <PageButton
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </PageButton>
            <PageButton
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </PageButton>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mốc màu nội suy cho thang điểm 0..10: đỏ -> vàng -> xanh lá -> xanh dương. */
const SCORE_COLOR_STOPS: [number, [number, number, number]][] = [
  [0, [239, 68, 68]], // đỏ
  [10 / 3, [234, 179, 8]], // vàng
  [20 / 3, [34, 197, 94]], // xanh lá
  [10, [59, 130, 246]], // xanh dương
];

function scoreColor(value: number): [number, number, number] {
  const v = Math.max(0, Math.min(10, value));
  for (let i = 0; i < SCORE_COLOR_STOPS.length - 1; i += 1) {
    const [p0, c0] = SCORE_COLOR_STOPS[i];
    const [p1, c1] = SCORE_COLOR_STOPS[i + 1];
    if (v <= p1) {
      const t = (v - p0) / (p1 - p0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
    }
  }
  return SCORE_COLOR_STOPS[SCORE_COLOR_STOPS.length - 1][1];
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  const [r, g, b] = scoreColor(value);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, 0.16)`, color: `rgb(${r}, ${g}, ${b})` }}
    >
      {label}
      <span className="font-bold">{value}</span>
    </span>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-[var(--color-text-secondary)] transition-colors enabled:cursor-pointer enabled:hover:border-[var(--color-accent)] enabled:hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
