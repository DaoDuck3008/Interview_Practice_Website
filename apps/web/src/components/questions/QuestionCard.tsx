"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, BookOpen, Bookmark, Star } from "lucide-react";
import type { Question } from "@/lib/api/questions";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import {
  getLearningQuestionHref,
  getPracticeQuestionHref,
} from "@/lib/utils/question-url";
import { useAuthStore } from "@/stores/auth.store";
import { useFavoritesStore } from "@/stores/favorites.store";

interface QuestionCardProps {
  question: Question;
  index: number;
  searchQuery?: string;
  /** Gọi sau khi bỏ lưu thành công để trang /saved xóa item khỏi danh sách ngay. */
  onFavoriteRemoved?: (questionId: string) => void;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm px-0.5"
            style={{ background: "rgba(250,204,21,0.2)", color: "#fde68a" }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function QuestionCard({
  question,
  index,
  searchQuery,
  onFavoriteRemoved,
}: QuestionCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const levelStyle = LEVEL_STYLE[question.level];
  const topicSlug = question.topic?.slug ?? "";

  const loggedIn = useAuthStore((s) => s.hydrated && !!s.user);
  const isFavorited = useFavoritesStore((s) => s.ids.has(question.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const currentQuery = searchParams.toString();
  const returnTo = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;

  function getDetailHref() {
    const href = getLearningQuestionHref(topicSlug, question);
    const params = new URLSearchParams({ returnTo });

    // Preserve list filters/page when users return from the detail screen.
    return `${href}?${params.toString()}`;
  }

  async function handleToggleFavorite(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    const wasFavorited = isFavorited;
    await toggleFavorite(question);
    if (wasFavorited) onFavoriteRemoved?.(question.id);
  }

  return (
    <article
      className="group overflow-hidden rounded-[24px] border px-4 py-3.5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 sm:px-5"
      style={{
        borderColor: "rgba(255,255,255,0.11)",
        background: "rgba(15, 23, 42, 0.52)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 40px rgba(2,6,23,0.18)",
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {question.isFeatured && (
          <Star size={14} className="mt-1 flex-shrink-0 text-[#fbbf24]" />
        )}

        <span className="mt-0.5 w-5 flex-shrink-0 text-right font-mono text-[11px] text-[#94a3b8]">
          #{index}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-6 text-[#d4d4e0] transition-colors duration-200 group-hover:text-[#f4f4f6]">
            <HighlightText text={question.content} query={searchQuery} />
          </p>

          {question.answerKeywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {question.answerKeywords.slice(0, 5).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border px-2.5 py-0.5 font-mono text-[11px]"
                  style={{
                    background: "rgba(124,58,237,0.07)",
                    borderColor: "rgba(124,58,237,0.2)",
                    color: "#a78bfa",
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${levelStyle.className}`}
          >
            {levelStyle.label}
          </span>

          {loggedIn && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.055] transition-all duration-200 hover:bg-white/[0.11]"
              style={{ color: isFavorited ? "#fbbf24" : "#606072" }}
              title={isFavorited ? "Bỏ lưu" : "Lưu câu hỏi"}
            >
              <Bookmark size={14} fill={isFavorited ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>

      {topicSlug && (
        <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:justify-end">
          <Link
            href={getDetailHref()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[#e9d5ff] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/35 hover:bg-white/[0.11] sm:w-auto"
          >
            Xem chi tiết
            <BookOpen size={14} />
          </Link>
          <Link
            href={getPracticeQuestionHref(topicSlug, question)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#c4b5fd]/30 bg-[#7c3aed]/20 px-4 py-2 text-sm font-semibold text-[#f4f4f6] shadow-[0_0_22px_rgba(124,58,237,0.12)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ddd6fe]/55 hover:bg-[rgba(139,92,246,0.24)] sm:w-auto"
          >
            Luyện tập
            <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </article>
  );
}
