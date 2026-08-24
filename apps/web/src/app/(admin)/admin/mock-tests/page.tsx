"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ClipboardCheck, Loader2, Search, SearchX, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getMockInterviewAdminStats,
  getMockInterviewsAdmin,
  type AdminMockInterviewListItem,
  type AdminMockInterviewQuery,
  type AdminMockInterviewStats,
  type MockInterviewStatus,
} from "@/lib/api/mockInterviews";
import { getTopics, type Topic } from "@/lib/api/topics";
import type { Paginated } from "@/lib/api/questions";
import { formatDate, formatDuration } from "@/lib/utils/format";
import { LEVELS } from "@/lib/utils/levels";
import { buildTopicOptions } from "@/lib/utils/topics";
import Pagination from "@/components/admin/Pagination";
import EmptyState from "@/components/ui/EmptyState";

const EMPTY: Paginated<AdminMockInterviewListItem> = { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
const EMPTY_STATS: AdminMockInterviewStats = { total: 0, inProgress: 0, scoring: 0, attention: 0 };
const GRID = "grid min-w-[820px] grid-cols-[1.35fr_1.7fr_120px_130px_145px] gap-4 px-5 items-center";

const statusLabel: Record<MockInterviewStatus | "ALL", string> = {
  ALL: "Tất cả trạng thái",
  DRAFT: "Bản nháp",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  SCORING: "Đang chấm",
  SCORED: "Đã chấm",
  ABANDONED: "Đã bỏ dở",
};

function statusClass(status: MockInterviewStatus) {
  if (status === "SCORED") return "border-success/30 bg-success/10 text-success";
  if (status === "SCORING" || status === "SUBMITTED") return "border-accent/30 bg-accent/10 text-accent-light";
  if (status === "IN_PROGRESS") return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  return "border-border bg-elevated text-text-muted";
}

export default function AdminMockTestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Paginated<AdminMockInterviewListItem>>(EMPTY);
  const [stats, setStats] = useState<AdminMockInterviewStats>(EMPTY_STATS);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") ?? "");
  const [topicId, setTopicId] = useState(searchParams.get("topicId") ?? "");
  const [level, setLevel] = useState(searchParams.get("level") ?? "ALL");
  const [status, setStatus] = useState(searchParams.get("status") ?? "ALL");
  const [attention, setAttention] = useState(searchParams.get("attention") ?? "all");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [limit, setLimit] = useState(Number(searchParams.get("limit") ?? "20"));

  useEffect(() => {
    getTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) { firstSearch.current = false; return; }
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (topicId) params.set("topicId", topicId);
    if (level !== "ALL") params.set("level", level);
    if (status !== "ALL") params.set("status", status);
    if (attention !== "all") params.set("attention", attention);
    if (page > 1) params.set("page", String(page));
    if (limit !== 20) params.set("limit", String(limit));
    router.replace(`/admin/mock-interviews${params.size ? `?${params}` : ""}`, { scroll: false });
  }, [attention, debouncedSearch, level, limit, page, router, status, topicId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: AdminMockInterviewQuery = {
        search: debouncedSearch || undefined,
        topicId: topicId || undefined,
        level: level === "ALL" ? undefined : (level as AdminMockInterviewQuery["level"]),
        status: status === "ALL" ? undefined : (status as MockInterviewStatus),
        attention: attention === "all" ? undefined : (attention as AdminMockInterviewQuery["attention"]),
        page,
        limit,
      };
      const [list, overview] = await Promise.all([getMockInterviewsAdmin(query), getMockInterviewAdminStats()]);
      if (list.items.length === 0 && list.page > 1) { setPage(list.page - 1); return; }
      setData(list);
      setStats(overview);
    } catch {
      toast.error("Không tải được danh sách mock interview.");
    } finally {
      setLoading(false);
    }
  }, [attention, debouncedSearch, level, limit, page, status, topicId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  function updateFilter(setter: (value: string) => void, value: string) { setter(value); setPage(1); }
  const hasFilters = Boolean(search || topicId) || level !== "ALL" || status !== "ALL" || attention !== "all";
  function resetFilters() { setSearch(""); setDebouncedSearch(""); setTopicId(""); setLevel("ALL"); setStatus("ALL"); setAttention("all"); setPage(1); }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Mock phỏng vấn</h2>
        <p className="mt-1 text-sm text-text-muted">Theo dõi bài mock, chất lượng chấm AI và hỗ trợ người dùng khi cần.</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng mock" value={stats.total} />
        <StatCard label="Đang làm" value={stats.inProgress} />
        <StatCard label="Đang/chờ chấm" value={stats.scoring} />
        <StatCard label="Cần xử lý" value={stats.attention} danger />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc email người dùng…" className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent" /></div>
        <select value={topicId} onChange={(event) => updateFilter(setTopicId, event.target.value)} className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none">{buildTopicOptions(topics, "Tất cả chủ đề")}</select>
        <select value={level} onChange={(event) => updateFilter(setLevel, event.target.value)} className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none">{LEVELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)} className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={attention} onChange={(event) => updateFilter(setAttention, event.target.value)} className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none"><option value="all">Tất cả tình trạng chấm</option><option value="failed">Có lỗi chấm</option><option value="stale">Chấm quá lâu</option></select>
        {hasFilters && <button onClick={resetFilters} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"><X size={14} />Xóa lọc</button>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <div className={`${GRID} border-b border-border py-3 text-xs font-medium uppercase tracking-wider text-text-muted`}><span>Người dùng</span><span>Mock test</span><span>Tiến độ</span><span>Trạng thái</span><span>Cập nhật</span></div>
        {loading ? <div className="flex justify-center py-16 text-text-muted"><Loader2 size={18} className="animate-spin" /></div> : data.items.length === 0 ? <EmptyState icon={SearchX} title={hasFilters ? "Không tìm thấy mock phù hợp" : "Chưa có mock interview nào"} description={hasFilters ? "Thử điều chỉnh hoặc xóa bớt bộ lọc." : "Dữ liệu mock interview sẽ xuất hiện ở đây khi người dùng bắt đầu làm bài."} action={hasFilters ? { label: "Xóa bộ lọc", onClick: resetFilters } : undefined} /> : data.items.map((item) => <button key={item.id} onClick={() => router.push(`/admin/mock-interviews/${item.id}`)} className={`${GRID} w-full border-b border-border py-3.5 text-left transition-colors last:border-0 hover:bg-elevated`}><div className="min-w-0"><p className="truncate text-sm text-text-primary">{item.user.name}</p><p className="truncate text-xs text-text-muted">{item.user.email}</p></div><div className="min-w-0"><p className="truncate text-sm text-text-secondary">{item.topics.map((topic) => topic.name).join(" · ") || item.title}</p><p className="text-xs text-text-muted">{item.totalQuestions} câu · {formatDuration(item.durationSeconds)}</p></div><div><p className="text-sm tabular-nums text-text-secondary">{item.answeredQuestions}/{item.totalQuestions}</p>{item.failedQuestions > 0 ? <p className="mt-0.5 text-xs text-danger">{item.failedQuestions} câu lỗi</p> : item.queuedQuestions > 0 ? <p className="mt-0.5 text-xs text-accent-light">{item.queuedQuestions} đang chấm</p> : null}</div><div><span className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClass(item.status)}`}>{statusLabel[item.status]}</span>{item.overallScore !== null && <p className="mt-1 text-xs font-semibold text-text-primary">Điểm {item.overallScore.toFixed(1)}</p>}</div><span className="text-xs text-text-secondary">{formatDate(item.updatedAt)}</span></button>)}
        {!loading && data.total > 0 && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={limit} onPageChange={setPage} onLimitChange={(next) => { setLimit(next); setPage(1); }} />}
      </div>

    </div>
  );
}

function StatCard({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-center justify-between"><p className="text-sm text-text-muted">{label}</p>{danger ? <AlertTriangle size={16} className="text-danger" /> : <ClipboardCheck size={16} className="text-text-muted" />}</div><p className={`mt-2 text-2xl font-bold tabular-nums ${danger && value > 0 ? "text-danger" : "text-text-primary"}`}>{value}</p></div>;
}
