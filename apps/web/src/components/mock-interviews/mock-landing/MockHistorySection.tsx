"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import type { MockInterview } from "@/lib/api/mockInterviews";
import {
  mockInterviewScoreBand,
  mockInterviewScoreText,
  mockInterviewTargetPath,
  mockInterviewTopics,
} from "@/lib/utils/mockInterview";
import { formatDay } from "@/lib/utils/format";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { TopicIcon } from "@/components/ui/TopicIcon";

export default function MockHistorySection({
  history,
  loadingHistory,
  userReady,
  onRefresh,
  page,
  total,
  totalPages,
  onPageChange,
  search,
  searching,
  sortOrder,
  onSearchChange,
  onSortOrderChange,
}: {
  history: MockInterview[];
  loadingHistory: boolean;
  userReady: boolean;
  onRefresh: () => void;
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  search: string;
  searching: boolean;
  sortOrder: "newest" | "oldest";
  onSearchChange: (value: string) => void;
  onSortOrderChange: (value: "newest" | "oldest") => void;
}) {
  const router = useRouter();

  return (
    <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-3 shadow-[0_18px_65px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:mt-5 sm:p-4 md:rounded-[2rem] md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary sm:text-2xl">
            Các buổi mock của bạn
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Tìm và tiếp tục các phiên luyện phỏng vấn gần đây.
          </p>
        </div>
        {userReady && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loadingHistory || searching}
            aria-label="Làm mới lịch sử mock"
            title="Làm mới"
            className="grid size-10 self-end place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={
                loadingHistory || searching ? "animate-spin" : undefined
              }
            />
          </button>
        )}
      </div>

      {userReady && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 focus-within:border-accent/60">
            <Search size={16} className="shrink-0 text-text-muted" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-busy={searching}
              placeholder="Tìm theo tên phiên hoặc chủ đề"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-text-secondary focus-within:border-accent/60">
            <ListFilter size={16} />
            <select
              value={sortOrder}
              onChange={(event) =>
                onSortOrderChange(event.target.value as "newest" | "oldest")
              }
              className="bg-transparent text-sm font-semibold text-text-primary outline-none"
            >
              <option value="newest" className="bg-elevated">
                Mới cập nhật
              </option>
              <option value="oldest" className="bg-elevated">
                Cũ nhất
              </option>
            </select>
          </label>
        </div>
      )}

      <div className="mt-4">
        {!userReady ? (
          <EmptyHistory
            title="Đăng nhập để xem lịch sử mock"
            text="Bạn vẫn có thể xem và cấu hình phiên mock. Khi bắt đầu, hệ thống sẽ đưa bạn tới trang đăng nhập."
          />
        ) : loadingHistory || searching ? (
          <HistorySkeleton searching={searching} />
        ) : history.length === 0 ? (
          <EmptyHistory
            title={
              search
                ? "Không tìm thấy phiên mock phù hợp"
                : "Chưa có buổi mock nào"
            }
            text={
              search
                ? "Thử tìm bằng tên phiên hoặc một chủ đề khác."
                : "Tạo phiên đầu tiên để luyện trả lời dưới áp lực thời gian và nhận báo cáo sau khi nộp bài."
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
              {history.map((mock, index) => {
                const targetPath = mockInterviewTargetPath(mock);
                const actionLabel = targetPath.endsWith("/result")
                  ? "Xem kết quả"
                  : "Xem tiếp";
                const levelStyle = LEVEL_STYLE[mock.level ?? "MIX"];
                const topics = mockInterviewTopics(mock);
                const dateText = mock.submittedAt
                  ? `Đã nộp ${formatDay(mock.submittedAt)}`
                  : mock.startedAt
                    ? `Bắt đầu ${formatDay(mock.startedAt)}`
                    : `Ngày tạo ${formatDay(mock.createdAt)}`;

                return (
                  <button
                    key={mock.id}
                    type="button"
                    onClick={() => router.push(targetPath)}
                    className="group cursor-pointer relative grid w-full max-w-[42rem] grid-cols-[5.25rem_minmax(0,1fr)] animate-[cardPushIn_650ms_120ms_cubic-bezier(.2,.8,.2,1)_both] items-stretch gap-2.5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-surface/70 p-2.5 text-left shadow-[0_20px_55px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-[transform,background-color,border-color] duration-300 hover:-translate-y-0.5 hover:border-accent-light/30 hover:bg-elevated/75 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3 sm:p-3 md:grid-cols-[7.5rem_minmax(0,1fr)] md:p-4"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-accent/5 [mask-image:linear-gradient(to_right,black,transparent)]" />
                    <ScoreBadge score={mock.overallScore} />

                    <div className="relative min-w-0 self-center">
                      <h3 className="truncate text-sm font-bold text-text-primary">
                        {mock.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold sm:px-2.5 sm:py-1 sm:text-xs ${levelStyle.className}`}
                        >
                          {levelStyle.label}
                        </span>
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-text-secondary sm:px-2.5 sm:py-1 sm:text-xs">
                          {Math.round(mock.durationSeconds / 60)} phút
                        </span>
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-text-secondary sm:px-2.5 sm:py-1 sm:text-xs">
                          {mock.totalQuestions} câu
                        </span>
                      </div>

                      <div className="mt-2 flex gap-1.5 overflow-hidden whitespace-nowrap sm:gap-2">
                        {topics.slice(0, 2).map((topic) => (
                          <span
                            key={topic.id}
                            className="inline-flex min-w-0 items-center gap-1 rounded-full border border-accent-light/15 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-text-primary sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs"
                          >
                            <TopicIcon iconUrl={topic.iconUrl} size={14} />
                            <span className="max-w-20 truncate sm:max-w-28">
                              {topic.name}
                            </span>
                          </span>
                        ))}
                        {topics.length > 2 && (
                          <span className="shrink-0 rounded-full border border-accent-light/20 bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent-light sm:px-2.5 sm:py-1 sm:text-xs">
                            +{topics.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative col-span-2 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted sm:text-sm">
                        <CalendarDays size={14} className="shrink-0" />
                        <span className="truncate">{dateText}</span>
                      </span>
                      <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-accent-light/25 bg-accent/10 px-2.5 text-xs font-semibold text-accent-light transition-colors duration-300 group-hover:bg-accent group-hover:text-white sm:h-9 sm:gap-2 sm:px-3.5">
                        {actionLabel}
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-300 group-hover:translate-x-0.5 sm:size-4"
                        />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {totalPages > 1 && (
              <HistoryPagination
                page={page}
                total={total}
                totalPages={totalPages}
                disabled={loadingHistory || searching}
                onPageChange={onPageChange}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function HistoryPagination({
  page,
  total,
  totalPages,
  disabled,
  onPageChange,
}: {
  page: number;
  total: number;
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  const pages = buildPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Phân trang lịch sử mock interview"
      className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-4 sm:mt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-text-muted">
        Trang {page}/{totalPages} · {total} buổi mock
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <PaginationButton
          label="Trang trước"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </PaginationButton>
        {pages.map((item, index) =>
          item === "…" ? (
            <span
              key={`ellipsis-${index}`}
              className="grid size-9 place-items-center text-sm font-bold text-text-muted"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={disabled || item === page}
              aria-current={item === page ? "page" : undefined}
              className={`grid size-9 place-items-center rounded-lg border text-sm font-bold transition-colors duration-200 ${
                item === page
                  ? "border-accent-light/40 bg-accent text-white"
                  : "border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent-light/30 hover:bg-white/[0.08] hover:text-text-primary disabled:cursor-default"
              }`}
            >
              {item}
            </button>
          ),
        )}
        <PaginationButton
          label="Trang sau"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </PaginationButton>
      </div>
    </nav>
  );
}

function PaginationButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-text-secondary transition-colors duration-200 hover:border-accent-light/30 hover:bg-white/[0.08] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// Rút gọn dãy trang dài để thanh điều hướng luôn gọn trên màn hình nhỏ.
function buildPageNumbers(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: (number | "…")[] = [1];
  if (page > 3) pages.push("…");
  for (
    let current = Math.max(2, page - 1);
    current <= Math.min(totalPages - 1, page + 1);
    current += 1
  ) {
    pages.push(current);
  }
  if (page < totalPages - 2) pages.push("…");
  pages.push(totalPages);
  return pages;
}

function ScoreBadge({ score }: { score: number | null }) {
  const band = mockInterviewScoreBand(score);

  return (
    <span
      className={[
        "relative grid min-h-[7.5rem] w-full place-items-center rounded-[1rem] border text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:min-h-24 md:h-24 md:w-[7.5rem]",
        band.borderClassName,
        band.backgroundClassName,
      ].join(" ")}
    >
      <span
        className={`text-3xl font-black leading-none ${band.textClassName}`}
      >
        {mockInterviewScoreText(score)}
      </span>
      <span className="-mt-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">
        Điểm
      </span>
    </span>
  );
}

function HistorySkeleton({ searching = false }: { searching?: boolean }) {
  return (
    <div
      className="flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">
        {searching
          ? "Đang tìm phiên mock phù hợp"
          : "Đang tải lịch sử mock interview"}
      </span>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`grid w-full max-w-[42rem] grid-cols-[5.25rem_minmax(0,1fr)] items-stretch gap-2.5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-surface/70 p-2.5 shadow-[0_20px_55px_rgba(2,6,23,0.22)] sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3 sm:p-3 md:grid-cols-[7.5rem_minmax(0,1fr)] md:p-4 ${
            searching
              ? "blur-[1px] motion-safe:animate-pulse"
              : "skeleton-pulse"
          }`}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <div className="min-h-[7.5rem] rounded-[1rem] bg-white/[0.07] sm:min-h-24 md:h-24" />
          <div className="min-w-0 self-center">
            <div className="h-4 w-2/5 rounded-md bg-white/[0.09]" />
            <div className="mt-2 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-accent/10" />
              <div className="h-6 w-20 rounded-full bg-white/[0.06]" />
              <div className="h-6 w-16 rounded-full bg-white/[0.06]" />
            </div>
            <div className="mt-2 flex gap-2">
              <div className="h-6 w-24 rounded-full bg-accent/10" />
              <div className="h-6 w-20 rounded-full bg-accent/10" />
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
            <div className="h-3 w-32 rounded-md bg-white/[0.06]" />
            <div className="h-8 w-24 rounded-lg bg-accent/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyHistory({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.025] px-5 py-10 text-center">
      <Sparkles size={20} className="mx-auto mb-3 text-accent-light" />
      <p className="font-bold text-text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        {text}
      </p>
    </div>
  );
}
