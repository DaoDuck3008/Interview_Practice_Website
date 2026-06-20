"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTopic = topics.find((t) => t.slug === currentTopicSlug);
  const childTopics = topics.filter((t) => t.parentId !== null);

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

  return (
    <div className="flex gap-3 items-start">
      {/* Sidebar — sticky block */}
      <TopicsSidebar
        topics={topics}
        currentSlug={currentTopicSlug}
        currentLevel={initialLevel}
      />

      {/* Main — transparent container */}
      <main className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Mobile topic switcher — cuộn ngang, thay cho sidebar (ẩn từ md trở lên) */}
        <div className="md:hidden -mx-4 px-4 flex gap-2 overflow-x-auto pb-1">
          {childTopics.map((topic) => {
            const active = topic.slug === currentTopicSlug;
            return (
              <Link
                key={topic.id}
                href={topicHref(topic.slug)}
                className="flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full border whitespace-nowrap flex-shrink-0 text-[13px] transition-colors duration-150"
                style={{
                  background: active
                    ? "rgba(124,58,237,0.18)"
                    : "rgba(255,255,255,0.04)",
                  borderColor: active
                    ? "rgba(124,58,237,0.5)"
                    : "rgba(255,255,255,0.08)",
                  color: active ? "#f4f4f6" : "#9898aa",
                }}
              >
                {topic.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={topic.iconUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain rounded flex-shrink-0"
                  />
                ) : (
                  <span className="w-5 h-5 rounded flex-shrink-0 bg-white/[0.07]" />
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
          className="rounded-2xl overflow-hidden mb-2"
          style={{
            background: "#141320",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Sub-header row */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 sm:px-5 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="text-sm font-semibold text-[#f4f4f6] flex-shrink-0">
              {currentTopic?.name ?? currentTopicSlug}
            </span>

            <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 flex justify-center">
              <div className="relative w-full max-w-sm">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606072] pointer-events-none"
                />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm câu hỏi..."
                  className="w-full h-8 pl-8 pr-7 text-sm rounded-full outline-none text-[#f4f4f6] placeholder-[#606072]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: searchValue
                      ? "1px solid rgba(124,58,237,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#606072] hover:text-[#9898aa] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <span className="hidden sm:block text-xs text-[#606072] flex-shrink-0">
              {total} câu hỏi
            </span>
          </div>

          {/* Level tabs */}
          <div className="flex items-center gap-0 px-4 sm:px-5 overflow-x-auto">
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
                    "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors duration-150 cursor-pointer",
                    active
                      ? "border-[#7c3aed] text-[#f4f4f6]"
                      : "border-transparent text-[#9898aa] hover:text-[#e4e4f0]",
                  ].join(" ")}
                >
                  {lvl.label}
                  {lvl.value === "ALL" && (
                    <span
                      className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${active ? "bg-[#7c3aed] text-white" : "text-[#606072]"}`}
                      style={!active ? { background: "rgba(255,255,255,0.06)" } : undefined}
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
            <p className="text-[#606072] text-sm">
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
    </div>
  );
}
