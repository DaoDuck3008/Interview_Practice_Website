"use client";

import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Question, Level } from "@/lib/api/questions";
import { LEVELS, LEVEL_DOT } from "@/lib/utils/levels";

interface Props {
  questions: Question[];
  currentQuestionId: string;
  topicSlug: string;
  topicName: string;
}

export default function PracticeSidebar({
  questions,
  currentQuestionId,
  topicSlug,
  topicName,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLevel = searchParams.get("level") as Level | null;

  const filtered = activeLevel
    ? questions.filter((q) => q.level === activeLevel)
    : questions;

  function setLevel(level: Level | "ALL") {
    const params = new URLSearchParams(searchParams.toString());
    if (level === "ALL") {
      params.delete("level");
    } else {
      params.set("level", level);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 overflow-hidden"
      style={{
        width: "30%",
        maxWidth: "320px",
        minWidth: "220px",
        borderRight: "1px solid #1c1c28",
        background: "#06060c",
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 py-4 flex flex-col gap-3"
        style={{ borderBottom: "1px solid #1c1c28" }}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-[#f4f4f6]">{topicName}</span>
          <span className="text-xs text-[#606072]">{questions.length} câu</span>
        </div>

        {/* Level filter */}
        <div className="flex gap-1.5">
          {LEVELS.map(({ value, label }) => {
            const isActive =
              value === "ALL" ? activeLevel === null : activeLevel === value;
            return (
              <button
                key={value}
                onClick={() => setLevel(value)}
                className="flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                style={{
                  background: isActive ? "#7c3aed" : "#13131c",
                  color: isActive ? "#ffffff" : "#9898aa",
                  border: `1px solid ${isActive ? "#7c3aed" : "#1c1c28"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.map((q, idx) => {
          const isActive = q.id === currentQuestionId;
          const levelParam = activeLevel ? `?level=${activeLevel}` : "";

          return (
            <Link
              key={q.id}
              href={`/practice/${topicSlug}/${q.id}${levelParam}`}
              className="flex items-start gap-3 px-4 py-3 transition-all duration-200 group cursor-pointer"
              style={{
                background: isActive ? "#13131c" : "transparent",
                borderLeft: isActive
                  ? "2px solid #7c3aed"
                  : "2px solid transparent",
              }}
            >
              {/* Level dot */}
              <span
                className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${LEVEL_DOT[q.level]}`}
                style={{ opacity: isActive ? 1 : 0.5 }}
              />

              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className="text-xs text-[#606072] font-medium flex-shrink-0"
                >
                  #{idx + 1}
                </span>
                <p
                  className="text-xs leading-relaxed line-clamp-2 transition-colors duration-200"
                  style={{ color: isActive ? "#f4f4f6" : "#9898aa" }}
                >
                  {q.content}
                </p>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="px-4 py-8 text-xs text-center text-[#606072]">
            Không có câu hỏi cho cấp độ này.
          </p>
        )}
      </div>
    </aside>
  );
}
