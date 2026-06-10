"use client";

import { useRef, useState } from "react";
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
        {/* Header block — rounded */}
        <div
          className="rounded-2xl border border-[#1c1c28] overflow-hidden mb-2"
          style={{ background: "#0d0d16" }}
        >
          {/* Sub-header row */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-[#1c1c28]">
            <span className="text-sm font-semibold text-[#f4f4f6] flex-shrink-0">
              {currentTopic?.name ?? currentTopicSlug}
            </span>

            <div className="flex-1 flex justify-center">
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
                    background: "#13131c",
                    border: searchValue
                      ? "1px solid rgba(124,58,237,0.4)"
                      : "1px solid #1c1c28",
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

            <span className="text-xs text-[#606072] flex-shrink-0">
              {total} câu hỏi
            </span>
          </div>

          {/* Level tabs */}
          <div className="flex items-center gap-0 px-5 overflow-x-none">
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
                      className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${active ? "bg-[#7c3aed] text-white" : "bg-[#13131c] text-[#606072]"}`}
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
