"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { QuestionOrderItem, Level } from "@/lib/api/questions";

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
  const next = currentIdx < filtered.length - 1 ? filtered[currentIdx + 1] : null;

  const levelParam = level ? `?level=${level}` : "";
  const prevHref = prev ? `/practice/${topicSlug}/${prev.id}${levelParam}` : null;
  const nextHref = next ? `/practice/${topicSlug}/${next.id}${levelParam}` : null;

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Prev */}
      {prevHref ? (
        <Link
          href={prevHref}
          className="flex items-center gap-1 font-mono text-xs text-[#606072] hover:text-[#9898aa] transition-colors duration-200 cursor-pointer"
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">prev</span>
        </Link>
      ) : (
        <span className="flex items-center gap-1 font-mono text-xs text-[#3d3d54] cursor-not-allowed select-none">
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">prev</span>
        </span>
      )}

      {/* Question title */}
      <p className="flex-1 min-w-0 px-4 text-center text-xs text-[#9898aa] truncate">
        {questionTitle}
      </p>

      {/* Next */}
      {nextHref ? (
        <Link
          href={nextHref}
          className="flex items-center gap-1 font-mono text-xs text-[#606072] hover:text-[#9898aa] transition-colors duration-200 cursor-pointer"
        >
          <span className="hidden sm:inline">next</span>
          <ChevronRight size={13} />
        </Link>
      ) : (
        <span className="flex items-center gap-1 font-mono text-xs text-[#3d3d54] cursor-not-allowed select-none">
          <span className="hidden sm:inline">next</span>
          <ChevronRight size={13} />
        </span>
      )}
    </div>
  );
}
