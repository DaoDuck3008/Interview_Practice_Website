"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useSearchParams,
  useRouter,
  usePathname,
  useParams,
} from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Check, ChevronDown, List, Loader2, Search, Star } from "lucide-react";
import { getQuestionsCursor } from "@/lib/api/questions";
import type { Level } from "@/lib/api/questions";
import type { TopicWithCount } from "@/lib/api/topics";
import { LEVELS, LEVEL_DOT } from "@/lib/utils/levels";
import {
  getPracticeQuestionHref,
  parseQuestionSlugId,
} from "@/lib/utils/question-url";

const PAGE_SIZE = 15;

interface Props {
  topicId: string;
  topicSlug: string;
  topicName: string;
  topics: TopicWithCount[];
}

export default function PracticeSidebar({
  topicId,
  topicSlug,
  topicName,
  topics,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const currentQuestionSlugId =
    (params.questionSlugId as string | undefined) ?? "";
  const currentQuestionId = parseQuestionSlugId(currentQuestionSlugId).id;
  const activeLevel = searchParams.get("level") as Level | null;

  // Drawer trên mobile (desktop luôn hiện cột tĩnh)
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  function setLevel(level: Level | "ALL") {
    const next = new URLSearchParams(searchParams.toString());
    if (level === "ALL") {
      next.delete("level");
    } else {
      next.set("level", level);
    }
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  // Cursor pagination qua TanStack Query — cache theo (topicId, level),
  // không reset khi chuyển câu hỏi nhờ sidebar nằm ở layout
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["practice-questions", topicId, activeLevel],
    queryFn: ({ pageParam }) =>
      getQuestionsCursor({
        topicId,
        level: activeLevel ?? undefined,
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  // Tự tải tiếp tới khi câu đang mở xuất hiện (đảm bảo luôn highlight được,
  // kể cả khi mở thẳng link tới một câu nằm sâu trong danh sách)
  useEffect(() => {
    if (!currentQuestionId || isLoading) return;
    const hasActive = items.some((q) => q.id === currentQuestionId);
    if (!hasActive && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    currentQuestionId,
    items,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // Tự tải khi nút "Xem thêm" lọt vào màn hình (cuộn vô hạn)
  const { ref: sentinelRef, inView } = useInView();
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const topicCount =
    topics.find((t) => t.id === topicId)?.questionCount ?? items.length;

  // Cuộn tới câu đang mở — chỉ MỘT lần cho mỗi câu (khi đổi câu hoặc khi câu
  // đó lần đầu được tải). Không cuộn lại khi "Xem thêm" nối thêm câu ở cuối,
  // tránh việc danh sách bị giật về đầu mỗi lần tải thêm.
  const activeRef = useRef<HTMLAnchorElement>(null);
  const scrolledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentQuestionId) return;
    if (scrolledForRef.current === currentQuestionId) return;
    if (!activeRef.current) return; // câu đang mở chưa được tải -> chờ
    activeRef.current.scrollIntoView({ block: "center" });
    scrolledForRef.current = currentQuestionId;
  }, [currentQuestionId, items]);

  return (
    <>
      {/* Nút nổi mở danh sách câu hỏi — chỉ hiện trên mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full text-[13px] font-semibold text-white cursor-pointer active:scale-95 transition-transform"
        style={{
          background: "#7c3aed",
          boxShadow: "0 8px 24px rgba(124,58,237,0.45)",
        }}
        aria-label="Mở danh sách câu hỏi"
      >
        <List size={16} />
        Câu hỏi
      </button>

      {/* Lớp phủ tối phía sau drawer (mobile) */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: cột tĩnh trên desktop, drawer trượt từ trái trên mobile */}
      <aside
        className={`flex flex-col overflow-hidden transition-transform duration-300
          fixed inset-y-0 left-0 z-50 w-[85%] max-w-[340px] rounded-r-2xl
          md:static md:inset-auto md:z-auto md:w-[320px] md:max-w-none md:flex-shrink-0 md:translate-x-0 md:rounded-2xl
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "rgba(16, 15, 26, 0.55)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
      {/* Header — topic picker + level filter */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3.5 flex flex-col gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <TopicPicker
          topics={topics}
          currentSlug={topicSlug}
          currentName={topicName}
          questionCount={topicCount}
          onNavigate={closeMobile}
        />

        {/* Level filter — segmented control */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {LEVELS.map(({ value, label }) => {
            const isActive =
              value === "ALL" ? activeLevel === null : activeLevel === value;
            return (
              <button
                key={value}
                onClick={() => setLevel(value)}
                className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors duration-200 cursor-pointer"
                style={{
                  background: isActive ? "#7c3aed" : "transparent",
                  color: isActive ? "#ffffff" : "#9898aa",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
        {items.map((q, idx) => {
          const isActive = q.id === currentQuestionId;
          const levelParam = activeLevel ? `?level=${activeLevel}` : "";

          const featured = q.isFeatured;

          return (
            <Link
              key={q.id}
              ref={isActive ? activeRef : undefined}
              href={getPracticeQuestionHref(topicSlug, q, levelParam)}
              onClick={closeMobile}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group cursor-pointer"
              style={{
                background: isActive
                  ? "rgba(124,58,237,0.14)"
                  : featured
                    ? "rgba(245,158,11,0.10)"
                    : "transparent",
                // Câu nổi bật: luôn giữ viền amber bên trái, kể cả khi đang mở
                boxShadow: featured ? "inset 3px 0 0 #f59e0b" : undefined,
              }}
            >
              {/* Level dot */}
              <span
                className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${LEVEL_DOT[q.level]}`}
                style={{ opacity: isActive ? 1 : 0.55 }}
              />

              <div className="flex flex-col gap-1 min-w-0">
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#606072] tracking-wide">
                  {String(idx + 1).padStart(2, "0")}
                  {featured && (
                    <span
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(245,158,11,0.15)" }}
                    >
                      <Star
                        size={9}
                        className="text-[#f59e0b]"
                        fill="#f59e0b"
                        strokeWidth={0}
                      />
                      <span className="text-[9px] font-semibold tracking-normal text-[#f59e0b]">
                        Nổi bật
                      </span>
                    </span>
                  )}
                </span>
                <p
                  className="text-[13px] leading-snug line-clamp-2 transition-colors duration-200"
                  style={{
                    color: isActive
                      ? "#f4f4f6"
                      : featured
                        ? "#e4e4f0"
                        : "#9898aa",
                  }}
                >
                  {q.content}
                </p>
              </div>
            </Link>
          );
        })}

        {/* Xem thêm — đồng thời là sentinel tự tải khi cuộn tới đáy */}
        {hasNextPage && (
          <button
            ref={sentinelRef}
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-1 mx-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-[#9898aa] transition-colors duration-200 cursor-pointer hover:text-[#f4f4f6] disabled:cursor-default"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                Xem thêm
              </>
            )}
          </button>
        )}

        {/* Loading lần đầu */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-[#606072]">
            <Loader2 size={14} className="animate-spin" />
            Đang tải câu hỏi...
          </div>
        )}

        {/* Trống */}
        {!isLoading && items.length === 0 && (
          <p className="px-4 py-10 text-xs text-center text-[#606072]">
            {activeLevel
              ? "Không có câu hỏi cho cấp độ này."
              : "Chưa có câu hỏi nào."}
          </p>
        )}
      </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Topic picker — dropdown chọn/đổi chủ đề ngay trên sidebar         */
/* ------------------------------------------------------------------ */

function TopicPicker({
  topics,
  currentSlug,
  currentName,
  questionCount,
  onNavigate,
}: {
  topics: TopicWithCount[];
  currentSlug: string;
  currentName: string;
  questionCount: number;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài hoặc nhấn Escape
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectTopic(slug: string) {
    setOpen(false);
    setQuery("");
    if (slug === currentSlug) return;
    onNavigate?.();
    // /practice/[slug] sẽ tự redirect tới câu hỏi đầu tiên của topic
    router.push(`/practice/${slug}`);
  }

  // Nhóm cha → con; nếu không có topic con thì coi parent là mục chọn được
  const parents = topics.filter((t) => t.parentId === null);
  const childrenByParent = topics.reduce<Record<string, TopicWithCount[]>>(
    (acc, t) => {
      if (t.parentId) (acc[t.parentId] ??= []).push(t);
      return acc;
    },
    {},
  );
  const hasGroups = Object.keys(childrenByParent).length > 0;
  const ql = query.trim().toLowerCase();
  const match = (t: TopicWithCount) => !ql || t.name.toLowerCase().includes(ql);

  const currentTopic = topics.find((t) => t.slug === currentSlug);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-colors duration-200 cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: open
            ? "1px solid rgba(124,58,237,0.45)"
            : "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <TopicIcon iconUrl={currentTopic?.iconUrl ?? null} size={24} />
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-bold text-[#f4f4f6] truncate">
              {currentName}
            </span>
            <span className="text-[11px] text-[#606072] flex-shrink-0">
              {questionCount} câu
            </span>
          </span>
        </span>
        <ChevronDown
          size={15}
          className="text-[#9898aa] flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl overflow-hidden flex flex-col"
          style={{
            background: "#100f1a",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
            maxHeight: "min(60vh, 420px)",
          }}
        >
          {/* Search */}
          <div
            className="p-2 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606072] pointer-events-none"
              />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm chủ đề..."
                className="w-full h-8 pl-8 pr-3 text-[13px] rounded-lg outline-none text-[#f4f4f6] placeholder-[#606072]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto py-1.5">
            {hasGroups
              ? parents.map((parent) => {
                  const children = (childrenByParent[parent.id] ?? []).filter(
                    match,
                  );
                  if (children.length === 0) return null;
                  return (
                    <div key={parent.id}>
                      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#484860]">
                          {parent.name}
                        </span>
                        <span
                          className="flex-1 h-px"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        />
                      </div>
                      {children.map((t) => (
                        <TopicOption
                          key={t.id}
                          topic={t}
                          active={t.slug === currentSlug}
                          onSelect={() => selectTopic(t.slug)}
                        />
                      ))}
                    </div>
                  );
                })
              : topics
                  .filter(match)
                  .map((t) => (
                    <TopicOption
                      key={t.id}
                      topic={t}
                      active={t.slug === currentSlug}
                      onSelect={() => selectTopic(t.slug)}
                    />
                  ))}

            {topics.filter(match).length === 0 && (
              <p className="px-3 py-4 text-xs text-center text-[#606072]">
                Không tìm thấy chủ đề.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicIcon({
  iconUrl,
  size,
}: {
  iconUrl: string | null;
  size: number;
}) {
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className="object-contain rounded-md flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex-shrink-0 rounded-md"
      style={{
        width: size,
        height: size,
        background: "rgba(255,255,255,0.07)",
      }}
    />
  );
}

function TopicOption({
  topic,
  active,
  onSelect,
}: {
  topic: TopicWithCount;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] transition-colors duration-150 cursor-pointer hover:bg-white/[0.04]"
      style={active ? { background: "rgba(124,58,237,0.16)" } : undefined}
    >
      <span className="flex items-center gap-2 min-w-0">
        <TopicIcon iconUrl={topic.iconUrl} size={20} />
        <span
          className="truncate"
          style={{ color: active ? "#f4f4f6" : "#9898aa" }}
        >
          {topic.name}
        </span>
      </span>
      <span className="flex items-center gap-2 flex-shrink-0">
        <span
          className="text-[11px] font-mono min-w-[22px] text-center px-1.5 py-0.5 rounded-md"
          style={
            active
              ? { background: "#7c3aed", color: "white" }
              : { background: "rgba(255,255,255,0.06)", color: "#606072" }
          }
        >
          {topic.questionCount}
        </span>
        {active && <Check size={14} className="text-[#8b5cf6]" />}
      </span>
    </button>
  );
}
