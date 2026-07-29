"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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
import { TopicIcon } from "@/components/ui/TopicOption";

export default function MockHistorySection({
  history,
  loadingHistory,
  userReady,
  onRefresh,
  page,
  total,
  totalPages,
  onPageChange,
}: {
  history: MockInterview[];
  loadingHistory: boolean;
  userReady: boolean;
  onRefresh: () => void;
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();

  return (
    <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:mt-5 sm:p-4 md:rounded-[2rem] md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div
          style={{
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <p className="bg-[linear-gradient(90deg,#ddd6fe,#8b5cf6_48%,#f5f3ff)] bg-clip-text text-xs font-bold uppercase tracking-[0.18em] text-transparent">
            Lịch sử gần đây
          </p>
          <h2 className="mt-1 bg-[linear-gradient(90deg,#fff,#c4b5fd_48%,#93c5fd)] bg-clip-text text-xl font-black text-transparent sm:text-2xl">
            Các buổi mock của bạn
          </h2>
        </div>
        {userReady && (
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Làm mới lịch sử mock"
            title="Làm mới"
            className="inline-flex size-10 self-end items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-[#d8d6ea] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.1] sm:h-auto sm:w-auto sm:self-auto sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm sm:font-bold"
          >
            <RefreshCw
              size={15}
              className={loadingHistory ? "animate-spin" : undefined}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        )}
      </div>

      {!userReady ? (
        <EmptyHistory
          title="Đăng nhập để xem lịch sử mock"
          text="Bạn vẫn có thể xem và cấu hình phiên mock. Khi bắt đầu, hệ thống sẽ đưa bạn tới trang đăng nhập."
        />
      ) : loadingHistory ? (
        <HistorySkeleton />
      ) : history.length === 0 ? (
        <EmptyHistory
          title="Chưa có buổi mock nào"
          text="Tạo phiên đầu tiên để luyện trả lời dưới áp lực thời gian và nhận báo cáo sau khi nộp bài."
        />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:flex-wrap items-stretch gap-3">
            {history.map((mock, index) => {
              const targetPath = mockInterviewTargetPath(mock);
              const actionLabel = targetPath.endsWith("/result")
                ? "Xem kết quả"
                : "Xem tiếp";
              const levelStyle = LEVEL_STYLE[mock.level ?? "MIX"];
              const topics = mockInterviewTopics(mock);

              return (
                <button
                  key={mock.id}
                  type="button"
                  onClick={() => router.push(targetPath)}
                  className="group grid w-full max-w-[40rem] grid-cols-[5.25rem_minmax(0,1fr)] items-stretch gap-2.5 overflow-hidden rounded-[1.25rem] border border-white/12 bg-[#0f172a]/52 p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#c4b5fd]/35 hover:bg-white/[0.08] sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3 sm:rounded-[1.5rem] sm:p-3 md:grid-cols-[7.5rem_minmax(0,1fr)] md:p-4"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <ScoreBadge score={mock.overallScore} />

                  <div className="min-w-0 self-center">
                    <h3 className="truncate text-sm font-black text-white">
                      {mock.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold sm:px-2.5 sm:py-1 sm:text-xs ${levelStyle.className}`}
                      >
                        {levelStyle.label}
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-bold text-[#d8d6ea] sm:px-2.5 sm:py-1 sm:text-xs">
                        {Math.round(mock.durationSeconds / 60)} phút
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-bold text-[#d8d6ea] sm:px-2.5 sm:py-1 sm:text-xs">
                        {mock.totalQuestions} câu
                      </span>
                    </div>

                    <div className="mt-2 flex gap-1.5 overflow-hidden whitespace-nowrap sm:gap-2">
                      {topics.slice(0, 2).map((topic) => (
                        <span
                          key={topic.id}
                          className="inline-flex min-w-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[11px] font-semibold text-[#d8d6ea] sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs"
                        >
                          <TopicIcon iconUrl={topic.iconUrl} size={14} />
                          <span className="max-w-20 truncate sm:max-w-28">
                            {topic.name}
                          </span>
                        </span>
                      ))}
                      {topics.length > 2 && (
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[11px] font-bold text-[#d8d6ea] sm:px-2.5 sm:py-1 sm:text-xs">
                          +{topics.length - 2}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 sm:gap-3">
                      <p className="truncate text-xs text-[#a7a3bd] sm:text-sm">
                        {mock.submittedAt
                          ? `Đã nộp lúc ${formatDay(mock.submittedAt)}`
                          : mock.startedAt
                            ? "Đang trong phiên luyện tập"
                            : `Tạo lúc ${formatDay(mock.createdAt)}`}
                      </p>
                      <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#c4b5fd]/35 bg-[#7c3aed]/14 px-2.5 text-xs font-black text-[#ede9fe] transition-all duration-300 group-hover:bg-[#7c3aed] group-hover:text-white sm:h-9 sm:gap-2 sm:px-3.5 sm:text-sm">
                        {actionLabel}
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-300 group-hover:translate-x-0.5 sm:size-4"
                        />
                      </span>
                    </div>
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
              disabled={loadingHistory}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
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
      <p className="text-sm text-[#a7a3bd]">
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
              className="grid size-9 place-items-center text-sm font-bold text-[#a7a3bd]"
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
              className={`grid size-9 place-items-center rounded-full border text-sm font-bold transition-all duration-200 ${
                item === page
                  ? "border-[#c4b5fd]/40 bg-[#7c3aed]/70 text-white shadow-[0_0_18px_rgba(124,58,237,0.28)]"
                  : "border-white/10 bg-white/[0.045] text-[#d8d6ea] hover:border-[#c4b5fd]/35 hover:bg-white/[0.1] disabled:cursor-default"
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
      className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-[#d8d6ea] transition-all duration-200 hover:border-[#c4b5fd]/35 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
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
        "grid min-h-[7.5rem] w-full place-items-center rounded-[1rem] border text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:min-h-24 sm:rounded-[1.25rem] md:h-24 md:w-[7.5rem]",
        band.borderClassName,
        band.backgroundClassName,
      ].join(" ")}
    >
      <span
        className={`text-3xl font-black leading-none ${band.textClassName}`}
      >
        {mockInterviewScoreText(score)}
      </span>
      <span className="-mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a7a3bd]">
        Điểm
      </span>
    </span>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-[1.25rem] border border-white/10 bg-white/[0.045] sm:rounded-3xl"
        />
      ))}
    </div>
  );
}

function EmptyHistory({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/14 bg-white/[0.035] px-5 py-10 text-center">
      <Sparkles size={20} className="mx-auto mb-3 text-[#c4b5fd]" />
      <p className="font-black text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#a7a3bd]">
        {text}
      </p>
    </div>
  );
}
