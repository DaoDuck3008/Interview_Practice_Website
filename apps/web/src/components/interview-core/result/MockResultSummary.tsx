import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { InterviewSessionView } from "@/lib/interview-core/types";
import { formatDateTime, formatTime } from "@/lib/utils/format";
import {
  mockInterviewScoreBand,
  mockInterviewStatusBadge,
  mockInterviewTopicLabel,
} from "@/lib/utils/mockInterview";
import { AnimatedScoreNumber, ScoreBar } from "./MockResultScore";
import { ResultGlassPanel } from "./MockResultShell";

type ResultCounts = {
  answeredCount: number;
  skippedCount: number;
  scoredCount: number;
  failedCount: number;
  pendingCount: number;
};

// Hero của trang kết quả, chỉ hiển thị sau khi toàn bộ pipeline chấm điểm hoàn tất.
export function ResultHero({
  mock,
  counts,
}: {
  mock: InterviewSessionView;
  counts: ResultCounts;
}) {
  const overall = mock.overallScore;
  const overallBand = mockInterviewScoreBand(overall);
  const overallProgress =
    overall === null ? 0 : Math.max(0, Math.min(100, overall * 10));

  return (
    <ResultGlassPanel className="overflow-hidden p-5 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-start">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusChip status={mock.status} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/80">
            Báo cáo mock interview
          </p>
          <h1 className="mt-2 max-w-3xl text-balance bg-[linear-gradient(180deg,#ffffff_0%,#ddd6fe_58%,rgba(196,181,253,0.82)_100%)] bg-clip-text text-3xl font-black leading-tight text-transparent md:text-5xl">
            {mock.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
            {mock.contextLabel ?? mockInterviewTopicLabel(mock)} ·{" "}
            {mock.totalQuestions} câu · {formatTime(mock.durationSeconds)}
          </p>
        </div>

        <div
          className={[
            "rounded-[1.5rem] border p-5 text-center shadow-lg backdrop-blur-xl transition-colors duration-500",
            overallBand.borderClassName,
            overallBand.backgroundClassName,
            overallBand.shadowClassName,
          ].join(" ")}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            Điểm tổng
          </p>
          <p
            className={[
              "mt-2 font-mono text-5xl font-black tabular-nums transition-colors duration-500",
              overallBand.textClassName,
            ].join(" ")}
          >
            <AnimatedScoreNumber value={overall} />
          </p>
          <p className="mt-1 text-xs font-bold text-white/62">
            {overallBand.label} · / 10 điểm
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={[
                "h-full rounded-full transition-all duration-700 ease-out",
                overallBand.progressClassName,
              ].join(" ")}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Đã trả lời"
          value={counts.answeredCount}
          tone="success"
        />
        <MetricCard label="Bỏ qua" value={counts.skippedCount} />
        <MetricCard label="Đã chấm" value={counts.scoredCount} tone="success" />
        <MetricCard
          label="Đang chấm"
          value={counts.pendingCount}
          tone="accent"
        />
        <MetricCard label="Lỗi chấm" value={counts.failedCount} tone="danger" />
      </div>
    </ResultGlassPanel>
  );
}

// Khối tổng hợp điểm thành phần và các mốc thời gian của buổi mock.
export function ResultSummaryPanel({ mock }: { mock: InterviewSessionView }) {
  return (
    <ResultGlassPanel className="p-5">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/80">
          Tổng hợp nhanh
        </p>
        <h2 className="text-xl font-black text-white">
          Điểm, tiến độ và mốc thời gian
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
          <p className="text-sm font-bold text-white">Breakdown điểm</p>
          <p className="mt-1 text-xs text-white/45">
            Trung bình các câu đã chấm thành công.
          </p>
          <div className="mt-4 space-y-4">
            <ScoreBar label="Kỹ thuật" value={mock.averageTechnicalScore} />
            <ScoreBar label="Đầy đủ" value={mock.averageCompletenessScore} />
            <ScoreBar label="Rõ ràng" value={mock.averageClarityScore} />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 text-sm text-white/62 backdrop-blur-xl">
          <p className="font-bold text-white">Mốc thời gian</p>
          <div className="mt-4 space-y-2.5">
            <DateRow label="Bắt đầu" value={mock.startedAt} />
            <DateRow label="Nộp bài" value={mock.submittedAt} />
            <DateRow label="Chấm xong" value={mock.scoredAt} />
          </div>
        </div>
      </div>
    </ResultGlassPanel>
  );
}

// Nhận xét tổng quan AI gồm tóm tắt, điểm mạnh, điểm thiếu và gợi ý luyện tiếp.
export function OverviewPanel({ mock }: { mock: InterviewSessionView }) {
  const hasOverview =
    !!mock.summary ||
    mock.strengths.length > 0 ||
    mock.weaknesses.length > 0 ||
    mock.nextRecommendations.length > 0;

  return (
    <ResultGlassPanel className="p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/80">
          Tổng quan AI
        </p>
        <h2 className="mt-1 text-xl font-black text-white">
          Nhận định sau buổi mock
        </h2>
      </div>

      {!hasOverview ? (
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-sm text-white/62">
          <Loader2 size={16} className="animate-spin text-violet-200" />
          Đang tổng hợp nhận xét tổng quan. Trang sẽ tự cập nhật khi backend
          chấm xong.
        </div>
      ) : (
        <div className="space-y-4">
          {mock.summary && (
            <blockquote className="rounded-[1.25rem] border border-violet-200/20 bg-violet-400/12 p-4 text-sm leading-7 text-white/75 shadow-lg shadow-violet-950/10 backdrop-blur-xl">
              {mock.summary}
            </blockquote>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <InsightList
              title="Điểm mạnh"
              items={mock.strengths}
              tone="success"
            />
            <InsightList
              title="Điểm thiếu"
              items={mock.weaknesses}
              tone="danger"
            />
            <InsightList
              title="Nên luyện tiếp"
              items={mock.nextRecommendations}
              tone="accent"
            />
          </div>
        </div>
      )}

      {mock.overviewError && (
        <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          {mock.overviewError}
        </p>
      )}
    </ResultGlassPanel>
  );
}

function StatusChip({ status }: { status: InterviewSessionView["status"] }) {
  const badge = mockInterviewStatusBadge(status);
  return <span className={badge.className}>{badge.label}</span>;
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "accent" | "danger";
}) {
  const text =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "accent"
          ? "text-accent-light"
          : "text-white";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-xl">
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-black tabular-nums ${text}`}>
        {value}
      </p>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/45">{label}</span>
      <span className="text-right text-white/70">{formatDateTime(value)}</span>
    </div>
  );
}

function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "danger" | "accent";
}) {
  const icon =
    tone === "success" ? (
      <CheckCircle2 size={15} className="text-success" />
    ) : tone === "danger" ? (
      <AlertCircle size={15} className="text-danger" />
    ) : (
      <Sparkles size={15} className="text-accent-light" />
    );

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        {icon}
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-white/45">Chưa có dữ liệu.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex gap-2 text-sm leading-6 text-white/62"
            >
              <span
                className={[
                  "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                  tone === "success"
                    ? "bg-success"
                    : tone === "danger"
                      ? "bg-danger"
                      : "bg-accent",
                ].join(" ")}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
