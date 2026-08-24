"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BrainCircuit,
  FileSearch,
  FileText,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getMockCvAdminStats,
  getMockCvsAdmin,
  type AdminMockCvListItem,
  type AdminMockCvQuery,
  type AdminMockCvStats,
  type MockCvAnalysisStatus,
  type MockCvQuestionGenerationStatus,
} from "@/lib/api/mockCvs";
import type { MockInterviewStatus } from "@/lib/api/mockInterviews";
import type { Paginated } from "@/lib/api/questions";
import { formatDate, formatFileSize } from "@/lib/utils/format";
import {
  analysisStatusClass,
  interviewStatusClass,
  MOCK_CV_ANALYSIS_STATUS_LABEL,
  MOCK_CV_QUESTION_STATUS_LABEL,
  MOCK_INTERVIEW_STATUS_LABEL,
  questionStatusClass,
} from "@/lib/utils/mockAdmin";
import Pagination from "@/components/admin/Pagination";
import EmptyState from "@/components/ui/EmptyState";

const EMPTY: Paginated<AdminMockCvListItem> = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};
const EMPTY_STATS: AdminMockCvStats = {
  total: 0,
  processing: 0,
  scoring: 0,
  attention: 0,
};
const GRID =
  "grid min-w-[940px] grid-cols-[1.2fr_1.6fr_1.35fr_1fr_140px] items-center gap-4 px-5";

const ANALYSIS_OPTIONS: Array<{
  value: "ALL" | MockCvAnalysisStatus;
  label: string;
}> = [
  { value: "ALL", label: "Tất cả phân tích" },
  ...Object.entries(MOCK_CV_ANALYSIS_STATUS_LABEL).map(([value, label]) => ({
    value: value as MockCvAnalysisStatus,
    label,
  })),
];

const QUESTION_OPTIONS: Array<{
  value: "ALL" | MockCvQuestionGenerationStatus;
  label: string;
}> = [
  { value: "ALL", label: "Tất cả bộ câu hỏi" },
  ...Object.entries(MOCK_CV_QUESTION_STATUS_LABEL).map(([value, label]) => ({
    value: value as MockCvQuestionGenerationStatus,
    label,
  })),
];

const INTERVIEW_OPTIONS: Array<{
  value: "ALL" | MockInterviewStatus;
  label: string;
}> = [
  { value: "ALL", label: "Tất cả phỏng vấn" },
  ...Object.entries(MOCK_INTERVIEW_STATUS_LABEL).map(([value, label]) => ({
    value: value as MockInterviewStatus,
    label,
  })),
];

export default function AdminMockCvPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Paginated<AdminMockCvListItem>>(EMPTY);
  const [stats, setStats] = useState<AdminMockCvStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") ?? "",
  );
  const [analysisStatus, setAnalysisStatus] = useState(
    searchParams.get("analysisStatus") ?? "ALL",
  );
  const [questionStatus, setQuestionStatus] = useState(
    searchParams.get("questionStatus") ?? "ALL",
  );
  const [interviewStatus, setInterviewStatus] = useState(
    searchParams.get("interviewStatus") ?? "ALL",
  );
  const [attention, setAttention] = useState(
    searchParams.get("attention") ?? "all",
  );
  const [order, setOrder] = useState(searchParams.get("order") ?? "desc");
  const [page, setPage] = useState(
    Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
  );
  const [limit, setLimit] = useState(
    Math.max(1, Number(searchParams.get("limit") ?? "20") || 20),
  );

  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (analysisStatus !== "ALL")
      params.set("analysisStatus", analysisStatus);
    if (questionStatus !== "ALL")
      params.set("questionStatus", questionStatus);
    if (interviewStatus !== "ALL")
      params.set("interviewStatus", interviewStatus);
    if (attention !== "all") params.set("attention", attention);
    if (order !== "desc") params.set("order", order);
    if (page > 1) params.set("page", String(page));
    if (limit !== 20) params.set("limit", String(limit));
    router.replace(`/admin/mock-cv${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [
    analysisStatus,
    attention,
    debouncedSearch,
    interviewStatus,
    limit,
    order,
    page,
    questionStatus,
    router,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: AdminMockCvQuery = {
        search: debouncedSearch || undefined,
        analysisStatus:
          analysisStatus === "ALL"
            ? undefined
            : (analysisStatus as MockCvAnalysisStatus),
        questionStatus:
          questionStatus === "ALL"
            ? undefined
            : (questionStatus as MockCvQuestionGenerationStatus),
        interviewStatus:
          interviewStatus === "ALL"
            ? undefined
            : (interviewStatus as MockInterviewStatus),
        attention:
          attention === "all"
            ? undefined
            : (attention as AdminMockCvQuery["attention"]),
        order: order as "asc" | "desc",
        page,
        limit,
      };
      const [list, overview] = await Promise.all([
        getMockCvsAdmin(query),
        getMockCvAdminStats(),
      ]);
      if (list.items.length === 0 && list.page > 1) {
        setPage(list.page - 1);
        return;
      }
      setData(list);
      setStats(overview);
    } catch {
      toast.error("Không tải được danh sách Mock CV.");
    } finally {
      setLoading(false);
    }
  }, [
    analysisStatus,
    attention,
    debouncedSearch,
    interviewStatus,
    limit,
    order,
    page,
    questionStatus,
  ]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const hasFilters =
    Boolean(search) ||
    analysisStatus !== "ALL" ||
    questionStatus !== "ALL" ||
    interviewStatus !== "ALL" ||
    attention !== "all" ||
    order !== "desc";

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setAnalysisStatus("ALL");
    setQuestionStatus("ALL");
    setInterviewStatus("ALL");
    setAttention("all");
    setOrder("desc");
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Mock CV</h2>
        <p className="mt-1 text-sm text-text-muted">
          Theo dõi pipeline phân tích CV, tạo câu hỏi và kết quả phỏng vấn của
          người dùng.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng CV" value={stats.total} icon={FileText} />
        <StatCard
          label="AI đang xử lý"
          value={stats.processing}
          icon={BrainCircuit}
        />
        <StatCard
          label="Đang/chờ chấm"
          value={stats.scoring}
          icon={Sparkles}
        />
        <StatCard
          label="Cần xử lý"
          value={stats.attention}
          icon={AlertTriangle}
          danger
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên, email, vị trí hoặc tên file…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
          />
        </div>
        <FilterSelect
          value={analysisStatus}
          onChange={(value) => updateFilter(setAnalysisStatus, value)}
          options={ANALYSIS_OPTIONS}
        />
        <FilterSelect
          value={questionStatus}
          onChange={(value) => updateFilter(setQuestionStatus, value)}
          options={QUESTION_OPTIONS}
        />
        <FilterSelect
          value={interviewStatus}
          onChange={(value) => updateFilter(setInterviewStatus, value)}
          options={INTERVIEW_OPTIONS}
        />
        <select
          value={attention}
          onChange={(event) => updateFilter(setAttention, event.target.value)}
          className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        >
          <option value="all">Tất cả tình trạng</option>
          <option value="failed">Có lỗi xử lý</option>
          <option value="stale">Xử lý quá lâu</option>
        </select>
        <select
          value={order}
          onChange={(event) => updateFilter(setOrder, event.target.value)}
          className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        >
          <option value="desc">Mới cập nhật</option>
          <option value="asc">Cũ cập nhật</option>
        </select>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <X size={14} />
            Xóa lọc
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <div
          className={`${GRID} border-b border-border py-3 text-xs font-medium uppercase tracking-wider text-text-muted`}
        >
          <span>Người dùng</span>
          <span>CV ứng tuyển</span>
          <span>Pipeline AI</span>
          <span>Phỏng vấn</span>
          <span>Cập nhật</span>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? SearchX : FileSearch}
            title={
              hasFilters ? "Không tìm thấy Mock CV phù hợp" : "Chưa có Mock CV"
            }
            description={
              hasFilters
                ? "Thử điều chỉnh hoặc xóa bớt bộ lọc."
                : "CV sẽ xuất hiện tại đây sau khi người dùng tải lên để luyện phỏng vấn."
            }
            action={
              hasFilters
                ? { label: "Xóa bộ lọc", onClick: resetFilters }
                : undefined
            }
          />
        ) : (
          data.items.map((item) => (
            <MockCvRow
              key={item.id}
              item={item}
              onOpen={() => router.push(`/admin/mock-cv/${item.id}`)}
            />
          ))
        )}

        {!loading && data.total > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        )}
      </div>

    </div>
  );
}

function MockCvRow({
  item,
  onOpen,
}: {
  item: AdminMockCvListItem;
  onOpen: () => void;
}) {
  const latestInterview = item.interviews[0];
  const analysis = item.analysis;

  return (
    <button
      onClick={onOpen}
      className={`${GRID} w-full cursor-pointer border-b border-border py-3.5 text-left transition-colors last:border-0 hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {item.user.name}
        </p>
        <p className="truncate text-xs text-text-muted">{item.user.email}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {item.targetRole}
        </p>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {item.fileName} · {formatFileSize(item.fileSize)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        {analysis ? (
          <>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${analysisStatusClass(analysis.status)}`}
            >
              {MOCK_CV_ANALYSIS_STATUS_LABEL[analysis.status]}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${questionStatusClass(analysis.questionGenerationStatus)}`}
            >
              {
                MOCK_CV_QUESTION_STATUS_LABEL[
                  analysis.questionGenerationStatus
                ]
              }
            </span>
          </>
        ) : (
          <span className="text-xs text-text-muted">Chưa có phân tích</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm tabular-nums text-text-secondary">
          {item._count.interviews} lần · {item._count.questions} câu
        </p>
        {latestInterview ? (
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${interviewStatusClass(latestInterview.status)}`}
            >
              {MOCK_INTERVIEW_STATUS_LABEL[latestInterview.status]}
            </span>
            {latestInterview.overallScore !== null && (
              <span className="text-xs font-semibold text-text-primary">
                {latestInterview.overallScore.toFixed(1)} điểm
              </span>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-text-muted">Chưa luyện tập</p>
        )}
      </div>
      <span className="text-xs text-text-secondary">
        {formatDate(item.updatedAt)}
      </span>
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function TableSkeleton() {
  return (
    <div aria-label="Đang tải danh sách Mock CV" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className={`${GRID} border-b border-border py-4 last:border-0`}
        >
          {["w-32", "w-48", "w-28", "w-24", "w-24"].map(
            (width, cellIndex) => (
              <div key={cellIndex} className="space-y-2">
                <div
                  className={`h-3 animate-pulse rounded-full bg-elevated ${width}`}
                />
                {cellIndex < 4 && (
                  <div className="h-2.5 w-20 animate-pulse rounded-full bg-border" />
                )}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        <Icon
          size={16}
          className={danger ? "text-danger" : "text-text-muted"}
        />
      </div>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums ${danger && value > 0 ? "text-danger" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}
