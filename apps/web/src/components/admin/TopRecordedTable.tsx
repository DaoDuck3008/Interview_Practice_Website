"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import {
  getTopRecordedQuestions,
  type TopRecordedQuestion,
} from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";

export default function TopRecordedTable({
  detailHref,
}: {
  detailHref?: string;
}) {
  const [top, setTop] = useState<TopRecordedQuestion[] | null>(null);

  useEffect(() => {
    getTopRecordedQuestions(10)
      .then(setTop)
      .catch(() => setTop([]));
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary">
          Top 10 câu hỏi được ghi âm nhiều nhất
        </h3>
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

      <div className="grid grid-cols-[40px_1fr_140px_90px_90px] gap-4 px-5 py-3 border-b border-border text-xs font-medium uppercase tracking-wider text-text-muted">
        <span>#</span>
        <span>Nội dung</span>
        <span>Chủ đề</span>
        <span>Cấp độ</span>
        <span className="text-right">Lượt ghi âm</span>
      </div>

      {!top ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[40px_1fr_140px_90px_90px] gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center"
          >
            <div className="h-3 w-4 rounded bg-elevated animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-elevated animate-pulse" />
            <div className="h-3 w-16 rounded bg-elevated animate-pulse" />
            <div className="h-4 w-12 rounded bg-elevated animate-pulse" />
            <div className="h-3 w-8 rounded bg-elevated animate-pulse justify-self-end" />
          </div>
        ))
      ) : top.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <Mic size={22} className="text-text-muted" />
          <p className="text-sm text-text-muted">Chưa có lượt ghi âm nào.</p>
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
              <span
                className="text-sm text-text-primary truncate"
                title={q.content}
              >
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
  );
}
