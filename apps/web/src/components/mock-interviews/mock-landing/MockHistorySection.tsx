"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import type { MockInterview } from "@/lib/api/mockInterviews";
import {
  mockInterviewScoreBand,
  mockInterviewScoreText,
  mockInterviewStatusBadge,
  mockInterviewTargetPath,
} from "@/lib/utils/mockInterview";
import { formatDay } from "@/lib/utils/format";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { TopicIcon } from "@/components/ui/TopicOption";

export default function MockHistorySection({
  history,
  loadingHistory,
  userReady,
  onRefresh,
}: {
  history: MockInterview[];
  loadingHistory: boolean;
  userReady: boolean;
  onRefresh: () => void;
}) {
  const router = useRouter();

  return (
    <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
          <h2 className="mt-1 bg-[linear-gradient(90deg,#fff,#c4b5fd_48%,#93c5fd)] bg-clip-text text-2xl font-black text-transparent">
            Các buổi mock của bạn
          </h2>
        </div>
        {userReady && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-[#d8d6ea] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.1]"
          >
            <RefreshCw
              size={15}
              className={loadingHistory ? "animate-spin" : undefined}
            />
            Làm mới
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
        <div className="grid gap-3 lg:grid-cols-2">
          {history.map((mock, index) => {
            const badge = mockInterviewStatusBadge(mock.status);
            const targetPath = mockInterviewTargetPath(mock);
            const actionLabel = targetPath.endsWith("/result")
              ? "Xem kết quả"
              : "Xem tiếp";
            const levelStyle = LEVEL_STYLE[mock.level ?? "MIX"];

            return (
              <button
                key={mock.id}
                onClick={() => router.push(targetPath)}
                className="group animate-[cardPushIn_520ms_cubic-bezier(.2,.8,.2,1)_both] rounded-3xl border border-white/10 bg-[#0f172a]/52 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#c4b5fd]/35 hover:bg-white/[0.08]"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <TopicIcon
                      iconUrl={mock.topic?.iconUrl ?? null}
                      size={42}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-black text-white">
                          {mock.title}
                        </h3>
                        <span className={badge.className}>{badge.label}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#a7a3bd]">
                        {mock.topic?.name ?? "Chủ đề đã xóa"} ·{" "}
                        {formatDay(mock.createdAt)}
                      </p>
                    </div>
                  </div>
                  <ScoreBadge score={mock.overallScore} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <HistoryStat
                    label="Câu hỏi"
                    value={`${mock.totalQuestions}`}
                  />
                  <HistoryStat
                    label="Thời lượng"
                    value={`${Math.round(mock.durationSeconds / 60)}p`}
                  />
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#77718f]">
                      Độ khó
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${levelStyle.className}`}
                    >
                      {levelStyle.label}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#77718f]">
                    {mock.submittedAt
                      ? `Đã nộp ${formatDay(mock.submittedAt)}`
                      : mock.startedAt
                        ? "Đang trong phiên luyện"
                        : "Chưa bắt đầu"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-sm font-bold text-[#c4b5fd] transition-all duration-300 group-hover:bg-[#7c3aed] group-hover:text-white">
                    {actionLabel}
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  const band = mockInterviewScoreBand(score);

  return (
    <span
      className={[
        "grid size-14 shrink-0 place-items-center rounded-2xl border text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
        band.borderClassName,
        band.backgroundClassName,
      ].join(" ")}
    >
      <span className={`text-lg font-black ${band.textClassName}`}>
        {mockInterviewScoreText(score)}
      </span>
      <span className="-mt-1 text-[10px] font-bold uppercase tracking-wide text-[#a7a3bd]">
        điểm
      </span>
    </span>
  );
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
      <p className="text-[11px] font-semibold text-[#77718f]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/[0.045]"
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
