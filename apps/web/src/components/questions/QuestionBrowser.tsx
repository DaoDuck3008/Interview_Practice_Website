"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUp, Search, X } from "lucide-react";
import TopicsSidebar from "./TopicsSidebar";
import QuestionCard from "./QuestionCard";
import LearningPagination from "./LearningPagination";
import type { TopicWithCount } from "@/lib/api/topics";
import type { Level, Paginated, Question } from "@/lib/api/questions";
import { LEVELS } from "@/lib/utils/levels";

interface QuestionBrowserProps {
  topics: TopicWithCount[];
  currentTopicSlug: string;
  initialResult: Paginated<Question>;
  initialPage: number;
  initialLimit: number;
  initialLevel?: Level;
  initialSearch?: string;
}

export default function QuestionBrowser({
  topics,
  currentTopicSlug,
  initialResult,
  initialPage,
  initialLimit,
  initialLevel,
  initialSearch,
}: QuestionBrowserProps) {
  const router = useRouter();
  const { items, total, totalPages } = initialResult;

  const [searchValue, setSearchValue] = useState(initialSearch ?? "");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const currentTopic = topics.find((t) => t.slug === currentTopicSlug);
  const childTopics = topics.filter((t) => t.parentId !== null);
  const levelBadgeClass: Record<Level, string> = {
    EASY: "bg-[#22c55e] shadow-[0_0_14px_rgba(34,197,94,0.45)]",
    MEDIUM: "bg-[#8b5cf6] shadow-[0_0_14px_rgba(139,92,246,0.45)]",
    HARD: "bg-[#ef4444] shadow-[0_0_14px_rgba(239,68,68,0.42)]",
  };

  function topicHref(slug: string) {
    return `/learning/${slug}/questions${initialLevel ? `?level=${initialLevel}` : ""}`;
  }

  function navigate(updates: {
    page?: number;
    level?: Level | "ALL";
    search?: string;
  }) {
    const params = new URLSearchParams();
    const newPage = updates.page ?? initialPage;
    const newLevel = updates.level !== undefined ? updates.level : initialLevel;
    const newSearch =
      updates.search !== undefined ? updates.search : initialSearch;

    if (newPage > 1) params.set("page", String(newPage));
    if (newLevel && newLevel !== "ALL") params.set("level", newLevel);
    if (newSearch?.trim()) params.set("search", newSearch.trim());

    const qs = params.toString();
    router.push(`/learning/${currentTopicSlug}/questions${qs ? `?${qs}` : ""}`);
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ search: value, page: 1 });
    }, 400);
  }

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 480);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    queueMicrotask(handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex items-start gap-3 mt-4">
      {/* Sidebar — sticky block */}
      <TopicsSidebar
        topics={topics}
        currentSlug={currentTopicSlug}
        currentLevel={initialLevel}
      />

      {/* Main — transparent container */}
      <main className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Mobile topic switcher — cuộn ngang, thay cho sidebar (ẩn từ md trở lên) */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
          {childTopics.map((topic) => {
            const active = topic.slug === currentTopicSlug;
            return (
              <Link
                key={topic.id}
                href={topicHref(topic.slug)}
                className="flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border pl-1.5 pr-3 text-[13px] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.12]"
                style={{
                  background: active
                    ? "rgba(124,58,237,0.24)"
                    : "rgba(255,255,255,0.075)",
                  borderColor: active
                    ? "rgba(196,181,253,0.34)"
                    : "rgba(255,255,255,0.12)",
                  color: active ? "#f4f4f6" : "#cbd5e1",
                }}
              >
                {topic.iconUrl ? (
                  <Image
                    src={topic.iconUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 flex-shrink-0 rounded-full object-contain"
                  />
                ) : (
                  <span className="h-5 w-5 flex-shrink-0 rounded-full bg-white/[0.07]" />
                )}
                {topic.name}
                <span className="font-mono text-[11px] text-[#606072]">
                  {topic.questionCount}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Header block — rounded */}
        <div
          className="mb-2 overflow-hidden rounded-[28px] backdrop-blur-2xl"
          style={{
            background: "rgba(15, 23, 42, 0.56)",
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 22px 60px rgba(2,6,23,0.26)",
          }}
        >
          {/* Sub-header row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3 sm:px-5">
            <span className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.075] py-1 pl-1.5 pr-3 text-sm font-semibold text-[#f4f4f6]">
              {currentTopic?.iconUrl ? (
                <Image
                  src={currentTopic.iconUrl}
                  alt=""
                  width={22}
                  height={22}
                  className="h-5.5 w-5.5 flex-shrink-0 rounded-full object-contain"
                />
              ) : (
                <span className="h-5.5 w-5.5 flex-shrink-0 rounded-full bg-white/[0.1]" />
              )}
              {currentTopic?.name ?? currentTopicSlug}
            </span>

            <div className="order-last flex w-full justify-center sm:order-none sm:w-auto sm:flex-1">
              <div className="relative w-full max-w-sm">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a78bfa]"
                />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm câu hỏi..."
                  className="h-9 w-full rounded-full pl-8 pr-9 text-sm text-[#f4f4f6] outline-none placeholder-[#94a3b8]"
                  style={{
                    background: "rgba(255,255,255,0.085)",
                    border: searchValue
                      ? "1px solid rgba(196,181,253,0.34)"
                      : "1px solid rgba(255,255,255,0.13)",
                  }}
                />
                {searchValue && (
                  <button
                    onClick={() => {
                      setSearchValue("");
                      if (debounceRef.current)
                        clearTimeout(debounceRef.current);
                      navigate({ search: "", page: 1 });
                    }}
                    className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#94a3b8] transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <span className="hidden flex-shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-[#c4b5fd] sm:block">
              {total} câu hỏi
            </span>
          </div>

          {/* Level tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-white/[0.08] px-4 py-3 sm:px-5">
            {LEVELS.map((lvl) => {
              const active =
                lvl.value === "ALL"
                  ? !initialLevel
                  : initialLevel === lvl.value;
              return (
                <button
                  key={lvl.value}
                  onClick={() =>
                    navigate({ level: lvl.value as Level | "ALL", page: 1 })
                  }
                  className={[
                    "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold backdrop-blur-xl transition-all duration-200",
                    active
                      ? "border-[#c4b5fd]/35 bg-[rgba(124,58,237,0.24)] text-[#f4f4f6] shadow-[0_0_22px_rgba(124,58,237,0.16)]"
                      : "border-white/[0.08] bg-white/[0.045] text-[#cbd5e1] hover:-translate-y-0.5 hover:bg-white/[0.1] hover:text-white",
                  ].join(" ")}
                >
                  {lvl.value !== "ALL" && (
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${levelBadgeClass[lvl.value]}`}
                      aria-hidden="true"
                    />
                  )}
                  {lvl.label}
                  {lvl.value === "ALL" && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${active ? "bg-[#7c3aed] text-white" : "text-[#c4b5fd]"}`}
                      style={
                        !active
                          ? { background: "rgba(255,255,255,0.075)" }
                          : undefined
                      }
                    >
                      {total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question rows */}
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <p className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm text-[#cbd5e1] backdrop-blur-xl">
              {searchValue
                ? `Không tìm thấy kết quả cho "${searchValue}".`
                : "Không có câu hỏi nào."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((question, i) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={(initialPage - 1) * initialLimit + i + 1}
                searchQuery={searchValue}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <LearningPagination
          page={initialPage}
          totalPages={totalPages}
          onPageChange={(p) => navigate({ page: p })}
        />
      </main>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Lên đầu trang"
          title="Lên đầu trang"
          className="fixed bottom-36 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0f172a]/60 text-[#d4d4e0] shadow-[0_18px_44px_rgba(2,6,23,0.34)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/50 hover:bg-white/[0.1] hover:text-white"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
