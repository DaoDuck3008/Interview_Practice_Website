"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { QuestionOrderItem, Level } from "@/lib/api/questions";
import { getPracticeQuestionHref } from "@/lib/utils/question-url";

interface Props {
  order: QuestionOrderItem[];
  currentQuestionId: string;
  topicSlug: string;
  questionTitle: string;
}

export default function PracticeNavFooter({
  order,
  currentQuestionId,
  topicSlug,
  questionTitle,
}: Props) {
  const searchParams = useSearchParams();
  const level = searchParams.get("level") as Level | null;

  const filtered = level ? order.filter((q) => q.level === level) : order;
  const currentIdx = filtered.findIndex((q) => q.id === currentQuestionId);

  const prev = currentIdx > 0 ? filtered[currentIdx - 1] : null;
  const next =
    currentIdx < filtered.length - 1 ? filtered[currentIdx + 1] : null;

  const levelParam = level ? `?level=${level}` : "";
  const prevHref = prev
    ? getPracticeQuestionHref(topicSlug, prev, levelParam)
    : null;
  const nextHref = next
    ? getPracticeQuestionHref(topicSlug, next, levelParam)
    : null;

  const navClass =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-semibold text-[#cbd5e1] backdrop-blur-xl transition-all duration-200 hover:border-[#c4b5fd]/35 hover:bg-white/[0.11] hover:text-white";
  const disabledClass =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 text-xs font-semibold text-[#475569]";

  return (
    <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] bg-[#0f172a]/48 px-4 py-3 backdrop-blur-2xl">
      {prevHref ? (
        <Link href={prevHref} className={navClass}>
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Trước</span>
        </Link>
      ) : (
        <span className={disabledClass}>
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Trước</span>
        </span>
      )}

      <p className="min-w-0 flex-1 truncate px-2 text-center text-xs font-medium text-[#94a3b8]">
        {questionTitle}
      </p>

      {nextHref ? (
        <Link href={nextHref} className={navClass}>
          <span className="hidden sm:inline">Tiếp</span>
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span className={disabledClass}>
          <span className="hidden sm:inline">Tiếp</span>
          <ChevronRight size={14} />
        </span>
      )}
    </div>
  );
}
