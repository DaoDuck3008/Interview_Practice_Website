"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Question, Level } from "@/lib/api/questions";

interface Props {
  questions: Question[];
  currentQuestionId: string;
  topicSlug: string;
}

export default function PracticeNavFooter({
  questions,
  currentQuestionId,
  topicSlug,
}: Props) {
  const searchParams = useSearchParams();
  const level = searchParams.get("level") as Level | null;

  const filtered = level ? questions.filter((q) => q.level === level) : questions;
  const currentIdx = filtered.findIndex((q) => q.id === currentQuestionId);

  const prev = currentIdx > 0 ? filtered[currentIdx - 1] : null;
  const next = currentIdx < filtered.length - 1 ? filtered[currentIdx + 1] : null;

  const levelParam = level ? `?level=${level}` : "";
  const prevHref = prev ? `/practice/${topicSlug}/${prev.id}${levelParam}` : null;
  const nextHref = next ? `/practice/${topicSlug}/${next.id}${levelParam}` : null;

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-t backdrop-blur-sm"
      style={{
        background: "rgba(6,6,12,0.97)",
        borderColor: "#1c1c28",
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

      {/* Center counter */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-mono text-xs text-[#f4f4f6] tabular-nums">
          {String(currentIdx + 1).padStart(2, "0")}
          <span className="text-[#606072]"> / {String(filtered.length).padStart(2, "0")}</span>
        </span>
        {level && (
          <span className="font-mono text-[10px] text-[#606072]">{level.toLowerCase()}</span>
        )}
      </div>

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
