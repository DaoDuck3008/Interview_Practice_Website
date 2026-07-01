"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getMyHistory, type HistoryItem } from "@/lib/api/sessions";
import type { Paginated } from "@/lib/api/questions";
import { formatDay, formatDuration } from "@/lib/utils/format";
import { LEVEL_STYLE } from "@/lib/utils/levels";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

const LIMIT = 10;

export default function PracticeHistoryList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<HistoryItem> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyHistory(page, LIMIT)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
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
              <li key={item.id} className="flex items-start gap-3 py-3.5">
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

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
      {label}
      <span className="font-bold text-[var(--color-text-primary)]">{value}</span>
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
