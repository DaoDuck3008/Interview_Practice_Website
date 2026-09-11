"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronDown, Search, X } from "lucide-react";
import TopicsSidebar from "./TopicsSidebar";
import QuestionCard from "./QuestionCard";
import LearningPagination from "./LearningPagination";
import type { TopicWithCount } from "@/lib/api/topics";
import type { Level, Paginated, Question } from "@/lib/api/questions";
import { LEVELS } from "@/lib/utils/levels";

type SortMode = "latest" | "easy" | "hard";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "latest", label: "Mới nhất" },
  { value: "easy", label: "Dễ trước" },
  { value: "hard", label: "Khó trước" },
];

interface QuestionBrowserProps {
  topics: TopicWithCount[];
  currentTopicSlug: string;
  initialResult: Paginated<Question>;
  initialPage: number;
  initialLimit: number;
  initialLevel?: Level;
  initialSearch?: string;
  initialSort: SortMode;
}

export default function QuestionBrowser({
  topics,
  currentTopicSlug,
  initialResult,
  initialPage,
  initialLimit,
  initialLevel,
  initialSearch,
  initialSort,
}: QuestionBrowserProps) {
  const router = useRouter();
  const { items, total, totalPages } = initialResult;

  const [searchValue, setSearchValue] = useState(initialSearch ?? "");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTopic = topics.find((t) => t.slug === currentTopicSlug);
  const isAllTopics = currentTopicSlug === "all";
  const currentTopicLabel = currentTopic?.name ?? "Tất cả topic";
  const childTopics = topics.filter((t) => t.parentId !== null);
  const levelCounts = initialResult.levelCounts ?? {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };
  const allLevelCount =
    levelCounts.EASY + levelCounts.MEDIUM + levelCounts.HARD;
  const resultKey = [
    currentTopicSlug,
    initialPage,
    initialLevel ?? "ALL",
    initialSearch ?? "",
    initialSort,
  ].join(":");

  const levelBadgeClass: Record<Level, string> = {
    EASY: "bg-[#22c55e] shadow-[0_0_14px_rgba(34,197,94,0.45)]",
    MEDIUM: "bg-[#8b5cf6] shadow-[0_0_14px_rgba(139,92,246,0.45)]",
    HARD: "bg-[#ef4444] shadow-[0_0_14px_rgba(239,68,68,0.42)]",
  };

  function buildHref(
    updates: {
      slug?: string;
      page?: number;
      level?: Level | "ALL";
      search?: string;
      sort?: SortMode;
    } = {},
  ) {
    const params = new URLSearchParams();
    const slug = updates.slug ?? currentTopicSlug;
    const newPage = updates.page ?? initialPage;
    const newLevel = updates.level !== undefined ? updates.level : initialLevel;
    const newSearch =
      updates.search !== undefined ? updates.search : initialSearch;
    const newSort = updates.sort ?? initialSort;

    if (newPage > 1) params.set("page", String(newPage));
    if (newLevel && newLevel !== "ALL") params.set("level", newLevel);
    if (newSearch?.trim()) params.set("search", newSearch.trim());
    if (newSort !== "easy") params.set("sort", newSort);

    const qs = params.toString();
    return `/learning/${slug}/questions${qs ? `?${qs}` : ""}`;
  }

  function navigate(updates: {
    page?: number;
    level?: Level | "ALL";
    search?: string;
    sort?: SortMode;
  }) {
    router.push(buildHref(updates));
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
      const shouldShow = window.scrollY > 480;
      setShowBackToTop((visible) =>
        visible === shouldShow ? visible : shouldShow,
      );
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    queueMicrotask(handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-4 flex items-start gap-3">
      <TopicsSidebar
        topics={topics}
        currentSlug={currentTopicSlug}
        currentLevel={initialLevel}
      />

      <main className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
          {childTopics.map((topic) => {
            const active = topic.slug === currentTopicSlug;

            return (
              <Link
                key={topic.id}
                href={buildHref({ slug: topic.slug, page: 1 })}
                className="flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border pl-1.5 pr-3 text-[13px] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white/[0.12]"
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
                <span className="font-mono text-[11px] text-[#94a3b8]">
                  {topic.questionCount}
                </span>
              </Link>
            );
          })}
        </div>

        <div
          className="mb-2 overflow-hidden rounded-[28px] content-ready-enter"
          style={{
            background: "rgba(20, 25, 56, 0.88)",
            border: "1px solid rgba(196,181,253,0.18)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 22px 60px rgba(2,6,23,0.26)",
          }}
        >
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
              {currentTopicLabel}
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
                      if (debounceRef.current) {
                        clearTimeout(debounceRef.current);
                      }
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

            <label className="relative inline-flex flex-shrink-0 items-center">
              <span className="sr-only">Sắp xếp câu hỏi</span>
              <select
                value={initialSort}
                onChange={(e) =>
                  navigate({ sort: e.target.value as SortMode, page: 1 })
                }
                className="h-9 cursor-pointer appearance-none rounded-full border border-white/10 bg-[#262639] pl-4 pr-9 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#302f4a]"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 text-[#c4b5fd]"
              />
            </label>
          </div>

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
                    "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-[transform,background-color,border-color] duration-200",
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
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${
                      active ? "bg-[#7c3aed] text-white" : "text-[#ddd6fe]"
                    }`}
                    style={
                      active
                        ? undefined
                        : { background: "rgba(255,255,255,0.075)" }
                    }
                  >
                    {lvl.value === "ALL"
                      ? allLevelCount
                      : levelCounts[lvl.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {(currentTopic ||
            isAllTopics ||
            initialLevel ||
            initialSearch ||
            initialSort !== "easy") && (
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] px-4 py-3 sm:px-5">
              {/* Applied filters keep context visible and removable. */}
              {currentTopic && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(buildHref({ slug: "all", page: 1 }))
                  }
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff] transition-all hover:bg-white/[0.11]"
                >
                  {currentTopic.name}
                  <X size={12} />
                </button>
              )}
              {isAllTopics && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff]">
                  Tất cả topic
                </span>
              )}
              {initialLevel && (
                <button
                  type="button"
                  onClick={() => navigate({ level: "ALL", page: 1 })}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff] transition-all hover:bg-white/[0.11]"
                >
                  {LEVELS.find((level) => level.value === initialLevel)?.label}
                  <X size={12} />
                </button>
              )}
              {initialSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue("");
                    navigate({ search: "", page: 1 });
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff] transition-all hover:bg-white/[0.11]"
                >
                  Search: {initialSearch}
                  <X size={12} />
                </button>
              )}
              {initialSort !== "easy" && (
                <button
                  type="button"
                  onClick={() => navigate({ sort: "easy", page: 1 })}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff] transition-all hover:bg-white/[0.11]"
                >
                  {
                    SORT_OPTIONS.find((option) => option.value === initialSort)
                      ?.label
                  }
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="max-w-xl rounded-[28px] border border-white/10 bg-[#151b2d] px-6 py-5 text-center text-sm text-[#cbd5e1]">
              <p className="font-semibold text-[#f4f4f6]">
                {initialSearch
                  ? `Không tìm thấy kết quả cho "${initialSearch}".`
                  : "Không có câu hỏi nào phù hợp."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {initialLevel && (
                  <button
                    type="button"
                    onClick={() => navigate({ level: "ALL", page: 1 })}
                    className="rounded-full border border-white/10 bg-white/[0.075] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff] transition-colors hover:bg-white/[0.12]"
                  >
                    Xóa level filter
                  </button>
                )}
                {initialSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchValue("");
                      navigate({ search: "", page: 1 });
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.075] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff] transition-colors hover:bg-white/[0.12]"
                  >
                    Xóa tìm kiếm
                  </button>
                )}
                {!isAllTopics && initialSearch && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(buildHref({ slug: "all", page: 1 }))
                    }
                    className="rounded-full border border-[#c4b5fd]/35 bg-[rgba(124,58,237,0.24)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[rgba(139,92,246,0.3)]"
                  >
                    Tìm trong tất cả topic
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div key={resultKey} className="flex flex-col gap-2">
            {items.map((question, i) => (
              <div
                key={question.id}
                className="collection-item-enter"
                style={
                  {
                    "--motion-enter-delay": `${Math.min(i, 7) * 35}ms`,
                  } as CSSProperties
                }
              >
                <QuestionCard
                  question={question}
                  index={(initialPage - 1) * initialLimit + i + 1}
                  searchQuery={searchValue}
                />
              </div>
            ))}
          </div>
        )}

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
          className="fixed bottom-36 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#171d31] text-[#d4d4e0] shadow-[0_18px_44px_rgba(2,6,23,0.34)] transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/50 hover:bg-[#232b46] hover:text-white"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
