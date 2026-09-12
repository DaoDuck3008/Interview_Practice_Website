"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { ArrowUp, ChevronDown, Search, X } from "lucide-react";
import TopicsSidebar from "./TopicsSidebar";
import QuestionCard from "./QuestionCard";
import LearningPagination from "./LearningPagination";
import type { TopicWithCount } from "@/lib/api/topics";
import {
  getQuestionsPublic,
  type Level,
  type Paginated,
  type Question,
} from "@/lib/api/questions";
import { LEVELS } from "@/lib/utils/levels";

type SortMode = "latest" | "easy" | "hard";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "latest", label: "Mới nhất" },
  { value: "easy", label: "Dễ trước" },
  { value: "hard", label: "Khó trước" },
];

const RESULT_CACHE_LIMIT = 24;
const questionResultCache = new Map<string, Paginated<Question>>();

interface BrowseState {
  slug: string;
  page: number;
  level?: Level;
  search?: string;
  sort: SortMode;
}

type BrowseUpdates = Omit<Partial<BrowseState>, "level"> & {
  level?: Level | "ALL";
};

function resultCacheKey(state: BrowseState) {
  return [
    state.slug,
    state.page,
    state.level ?? "ALL",
    state.search ?? "",
    state.sort,
  ].join(":");
}

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
  const [browseState, setBrowseState] = useState<BrowseState>(() => ({
    slug: currentTopicSlug,
    page: initialPage,
    level: initialLevel,
    search: initialSearch,
    sort: initialSort,
  }));
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState(initialSearch ?? "");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const { items, total, totalPages } = result;
  const currentTopic = topics.find((t) => t.slug === browseState.slug);
  const isAllTopics = browseState.slug === "all";
  const currentTopicLabel = currentTopic?.name ?? "Tất cả topic";
  const childTopics = topics.filter((t) => t.parentId !== null);
  const levelCounts = result.levelCounts ?? {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };
  const allLevelCount =
    levelCounts.EASY + levelCounts.MEDIUM + levelCounts.HARD;
  const resultKey = [
    browseState.slug,
    browseState.page,
    browseState.level ?? "ALL",
    browseState.search ?? "",
    browseState.sort,
  ].join(":");

  const levelBadgeClass: Record<Level, string> = {
    EASY: "bg-[#22c55e] shadow-[0_0_14px_rgba(34,197,94,0.45)]",
    MEDIUM: "bg-[#8b5cf6] shadow-[0_0_14px_rgba(139,92,246,0.45)]",
    HARD: "bg-[#ef4444] shadow-[0_0_14px_rgba(239,68,68,0.42)]",
  };

  function buildHref(state: BrowseState) {
    const params = new URLSearchParams();

    if (state.page > 1) params.set("page", String(state.page));
    if (state.level) params.set("level", state.level);
    if (state.search?.trim()) params.set("search", state.search.trim());
    if (state.sort !== "easy") params.set("sort", state.sort);

    const qs = params.toString();
    return `/learning/${state.slug}/questions${qs ? `?${qs}` : ""}`;
  }

  const loadResult = useCallback(
    async (nextState: BrowseState) => {
      const requestId = ++requestIdRef.current;
      const key = resultCacheKey(nextState);
      const cached = questionResultCache.get(key);
      if (cached) {
        setResult(cached);
        setLoading(false);
        return;
      }

      const topic = topics.find((item) => item.slug === nextState.slug);
      if (nextState.slug !== "all" && !topic) {
        setResult({
          items: [],
          total: 0,
          page: nextState.page,
          limit: initialLimit,
          totalPages: 0,
          levelCounts: { EASY: 0, MEDIUM: 0, HARD: 0 },
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextResult = await getQuestionsPublic({
        topicId: topic?.id,
        level: nextState.level,
        search: nextState.search,
        sortBy: nextState.sort === "latest" ? "createdAt" : "level",
        order: nextState.sort === "hard" ? "desc" : "asc",
        page: nextState.page,
        limit: initialLimit,
      });
      if (requestId !== requestIdRef.current) return;

      questionResultCache.set(key, nextResult);
      if (questionResultCache.size > RESULT_CACHE_LIMIT) {
        questionResultCache.delete(questionResultCache.keys().next().value!);
      }
      setResult(nextResult);
      setLoading(false);
    },
    [initialLimit, topics],
  );

  function navigate(
    updates: BrowseUpdates,
    historyMode: "push" | "replace" = "push",
  ) {
    const selectedLevel = updates.level;
    const nextLevel: Level | undefined =
      selectedLevel === "ALL"
        ? undefined
        : (selectedLevel ?? browseState.level);
    const nextState: BrowseState = {
      ...browseState,
      ...updates,
      level: nextLevel,
      search:
        updates.search !== undefined
          ? updates.search.trim() || undefined
          : browseState.search,
    };
    setBrowseState(nextState);
    if (historyMode === "replace") {
      window.history.replaceState(null, "", buildHref(nextState));
    } else {
      window.history.pushState(null, "", buildHref(nextState));
    }
    void loadResult(nextState);
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ search: value, page: 1 }, "replace");
    }, 400);
  }

  useEffect(() => {
    questionResultCache.set(
      resultCacheKey({
        slug: currentTopicSlug,
        page: initialPage,
        level: initialLevel,
        search: initialSearch,
        sort: initialSort,
      }),
      initialResult,
    );
  }, [
    currentTopicSlug,
    initialLevel,
    initialPage,
    initialResult,
    initialSearch,
    initialSort,
  ]);

  useEffect(() => {
    function handlePopState() {
      const segments = window.location.pathname.split("/");
      const slug = segments[2];
      if (!slug || segments[3] !== "questions") return;
      const params = new URLSearchParams(window.location.search);
      const level = params.get("level");
      const sort = params.get("sort");
      const nextState: BrowseState = {
        slug,
        page: Math.max(1, Number(params.get("page")) || 1),
        level: (["EASY", "MEDIUM", "HARD"] as Level[]).includes(level as Level)
          ? (level as Level)
          : undefined,
        search: params.get("search")?.trim() || undefined,
        sort: sort === "latest" || sort === "hard" ? sort : "easy",
      };
      setBrowseState(nextState);
      setSearchValue(nextState.search ?? "");
      void loadResult(nextState);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadResult]);

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

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-4 flex items-start gap-3">
      <TopicsSidebar
        topics={topics}
        currentSlug={browseState.slug}
        getTopicHref={(slug) => buildHref({ ...browseState, slug, page: 1 })}
        onTopicChange={(slug) => navigate({ slug, page: 1 })}
      />

      <main className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
          {childTopics.map((topic) => {
            const active = topic.slug === browseState.slug;

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => navigate({ slug: topic.slug, page: 1 })}
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
              </button>
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
                value={browseState.sort}
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
                  ? !browseState.level
                  : browseState.level === lvl.value;

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
        </div>

        {loading ? (
          <QuestionListSkeleton />
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="max-w-xl rounded-[28px] border border-white/10 bg-[#151b2d] px-6 py-5 text-center text-sm text-[#cbd5e1]">
              <p className="font-semibold text-[#f4f4f6]">
                {browseState.search
                  ? `Không tìm thấy kết quả cho "${browseState.search}".`
                  : "Không có câu hỏi nào phù hợp."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {browseState.level && (
                  <button
                    type="button"
                    onClick={() => navigate({ level: "ALL", page: 1 })}
                    className="rounded-full border border-white/10 bg-white/[0.075] px-3 py-1.5 text-xs font-semibold text-[#e9d5ff] transition-colors hover:bg-white/[0.12]"
                  >
                    Xóa level filter
                  </button>
                )}
                {browseState.search && (
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
                {!isAllTopics && browseState.search && (
                  <button
                    type="button"
                    onClick={() => navigate({ slug: "all", page: 1 })}
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
                  index={(browseState.page - 1) * initialLimit + i + 1}
                  searchQuery={browseState.search}
                />
              </div>
            ))}
          </div>
        )}

        <LearningPagination
          page={browseState.page}
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

function QuestionListSkeleton() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      <span className="sr-only">Đang cập nhật danh sách câu hỏi</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="skeleton-pulse h-24 rounded-2xl border border-white/10 bg-white/[0.06]"
          style={{ animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  );
}
