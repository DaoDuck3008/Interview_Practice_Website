"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SearchX, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getSessionsAdmin,
  type AdminSessionListItem,
  type AdminSessionQuery,
} from "@/lib/api/sessions";
import { getTopics, type Topic } from "@/lib/api/topics";
import type { Paginated } from "@/lib/api/questions";
import Pagination from "@/components/admin/Pagination";
import SessionDetailModal from "@/components/admin/SessionDetailModal";
import ActiveUsersView from "@/components/admin/ActiveUsersView";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, formatDuration } from "@/lib/utils/format";
import { LEVELS } from "@/lib/utils/levels";

const controlClass =
  "bg-[var(--color-surface)] border border-[var(--color-border)]";
const selectClass = `px-3 py-2 rounded-lg text-sm text-[var(--color-text-primary)] outline-none cursor-pointer ${controlClass}`;

const EMPTY: Paginated<AdminSessionListItem> = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const GRID = "grid grid-cols-[1.4fr_2fr_130px_150px] gap-4 px-5 items-center";

/** Điểm trung bình: <5 đỏ, 5-7 vàng, >=7 xanh lá — dùng cho cái nhìn nhanh ở bảng danh sách. */
function avgScoreColor(avg: number): string {
  if (avg >= 7) return "#22c55e";
  if (avg >= 5) return "#f59e0b";
  return "#ef4444";
}

export default function AdminSessionsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [tab, setTab] = useState<"list" | "stats">(
    sp.get("tab") === "stats" ? "stats" : "list",
  );

  const [data, setData] = useState<Paginated<AdminSessionListItem>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [search, setSearch] = useState(sp.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(sp.get("search") ?? "");
  const [topicId, setTopicId] = useState(sp.get("topicId") ?? "");
  const [level, setLevel] = useState(sp.get("level") ?? "ALL");
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [limit, setLimit] = useState(Number(sp.get("limit") ?? "20"));

  useEffect(() => {
    getTopics()
      .then((all) => setTopics(all.filter((t) => t.parentId !== null)))
      .catch(() => {});
  }, []);

  // Debounce ô tìm kiếm. Bỏ qua lần chạy đầu để không reset deep-link (?page=N).
  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (topicId) params.set("topicId", topicId);
    if (level !== "ALL") params.set("level", level);
    if (page > 1) params.set("page", String(page));
    if (limit !== 20) params.set("limit", String(limit));
    const qs = params.toString();
    router.replace(`/admin/sessions${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [debouncedSearch, topicId, level, page, limit, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSessionsAdmin({
        search: debouncedSearch || undefined,
        topicId: topicId || undefined,
        level: level === "ALL" ? undefined : (level as AdminSessionQuery["level"]),
        page,
        limit,
      });
      if (res.items.length === 0 && res.page > 1) {
        setPage(res.page - 1);
        return;
      }
      setData(res);
    } catch {
      toast.error("Không tải được danh sách session.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, topicId, level, page, limit]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const hasFilters = !!(search || topicId) || level !== "ALL";

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setTopicId("");
    setLevel("ALL");
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Câu trả lời
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Xem toàn bộ session luyện tập của mọi người dùng.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--color-border)]">
        {(
          [
            ["list", "Danh sách"],
            ["stats", "Thống kê"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer -mb-px border-b-2"
            style={{
              color: tab === key ? "#f4f4f6" : "#9898aa",
              borderColor: tab === key ? "#7c3aed" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "stats" ? (
        <ActiveUsersView />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc email người luyện tập…"
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] outline-none ${controlClass}`}
              />
            </div>

            <select
              value={topicId}
              onChange={(e) => changeFilter(setTopicId, e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={level}
              onChange={(e) => changeFilter(setLevel, e.target.value)}
              className={selectClass}
            >
              {LEVELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer ${controlClass}`}
              >
                <X size={14} />
                Xóa lọc
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div
              className={`${GRID} py-3 border-b border-[var(--color-border)] text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]`}
            >
              <span>Người dùng</span>
              <span>Câu hỏi</span>
              <span>Điểm</span>
              <span>Ngày tạo</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : data.items.length === 0 ? (
              hasFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="Không tìm thấy session phù hợp"
                  description="Không có session nào khớp với bộ lọc hiện tại. Thử điều chỉnh hoặc xóa bớt điều kiện lọc."
                  action={{ label: "Xóa bộ lọc", onClick: resetFilters }}
                />
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="Chưa có session nào"
                  description="Chưa có người dùng nào luyện tập trong hệ thống."
                />
              )
            ) : (
              data.items.map((s) => {
                const avg = s.score
                  ? (s.score.technicalScore +
                      s.score.completenessScore +
                      s.score.clarityScore) /
                    3
                  : null;
                return (
                  <button
                    key={s.id}
                    onClick={() => setDetailId(s.id)}
                    className={`${GRID} w-full text-left py-3.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-elevated)] transition-colors duration-150 cursor-pointer`}
                  >
                    <div className="min-w-0">
                      <p
                        className="text-sm text-[var(--color-text-primary)] truncate"
                        title={s.user.name}
                      >
                        {s.user.name}
                      </p>
                      <p
                        className="text-xs text-[var(--color-text-muted)] truncate"
                        title={s.user.email}
                      >
                        {s.user.email}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p
                        className="text-sm text-[var(--color-text-secondary)] truncate"
                        title={s.question.content}
                      >
                        {s.question.content}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {s.question.topic.name} · {formatDuration(s.duration)}
                      </p>
                    </div>

                    <span className="text-sm font-bold tabular-nums">
                      {avg === null ? (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          Chưa chấm
                        </span>
                      ) : (
                        <span style={{ color: avgScoreColor(avg) }}>
                          {avg.toFixed(1)}
                        </span>
                      )}
                    </span>

                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {formatDate(s.createdAt)}
                    </span>
                  </button>
                );
              })
            )}

            {!loading && data.total > 0 && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            )}
          </div>
        </>
      )}

      <SessionDetailModal
        sessionId={detailId}
        onClose={() => setDetailId(null)}
        onUpdated={load}
      />
    </div>
  );
}
