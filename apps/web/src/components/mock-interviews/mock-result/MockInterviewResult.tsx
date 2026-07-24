"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import {
  getMockInterviewResult,
  type MockInterview,
  type MockInterviewQuestion,
} from "@/lib/api/mockInterviews";
import type { Score } from "@/lib/api/sessions";
import { formatDateTime, formatTime } from "@/lib/utils/format";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import {
  MOCK_INTERVIEW_STATUS_LABEL,
  mockInterviewScoreBand,
  mockInterviewStatusBadge,
  mockQuestionStatusBadge,
} from "@/lib/utils/mockInterview";

type QuestionFilter = "ALL" | "SCORED" | "PENDING" | "SKIPPED" | "FAILED";

const FILTERS: Array<{ value: QuestionFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "SCORED", label: "Đã chấm" },
  { value: "PENDING", label: "Đang chấm" },
  { value: "SKIPPED", label: "Bỏ qua" },
  { value: "FAILED", label: "Lỗi" },
];

export default function MockInterviewResult({ id }: { id: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [mock, setMock] = useState<MockInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<QuestionFilter>("ALL");

  const loadResult = useCallback(
    async (options: { initial?: boolean } = {}) => {
      if (options.initial) setLoading(true);
      else setRefreshing(true);
      setError("");
      try {
        const data = await getMockInterviewResult(id);
        setMock(data);
      } catch (err) {
        const status = axios.isAxiosError(err)
          ? err.response?.status
          : undefined;
        if (status === 401) {
          router.push(
            `/login?redirect=${encodeURIComponent(`/mock-interviews/${id}/result`)}`,
          );
          return;
        }
        const serverMsg = axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined)
          : undefined;
        setError(serverMsg ?? "Không thể tải kết quả mock interview.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, router],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/mock-interviews/${id}/result`)}`,
      );
      return;
    }
    queueMicrotask(() => {
      void loadResult({ initial: true });
    });
  }, [hydrated, user, id, router, loadResult]);

  const questions = useMemo(() => mock?.questions ?? [], [mock?.questions]);
  const answeredCount = questions.filter(
    (q) => q.answerStatus === "ANSWERED",
  ).length;
  const skippedCount = questions.filter(
    (q) => q.answerStatus === "SKIPPED",
  ).length;
  const scoredCount = questions.filter(
    (q) => q.scoreStatus === "SCORED",
  ).length;
  const failedCount = questions.filter(
    (q) => q.scoreStatus === "FAILED",
  ).length;
  const pendingCount = questions.filter((q) =>
    ["PENDING", "QUEUED"].includes(q.scoreStatus),
  ).length;
  const shouldPoll =
    !!mock &&
    (mock.status === "SCORING" ||
      mock.status === "SUBMITTED" ||
      (mock.status !== "SCORED" && pendingCount > 0));

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = setInterval(() => {
      void loadResult();
    }, 4000);
    return () => clearInterval(timer);
  }, [shouldPoll, loadResult]);

  const visibleQuestions = useMemo(() => {
    if (filter === "ALL") return questions;
    if (filter === "PENDING") {
      return questions.filter((q) =>
        ["PENDING", "QUEUED"].includes(q.scoreStatus),
      );
    }
    return questions.filter((q) => q.scoreStatus === filter);
  }, [filter, questions]);

  if (!hydrated || loading) {
    return (
      <ResultShell>
        <ResultSkeleton />
      </ResultShell>
    );
  }

  if (error && !mock) {
    return (
      <ResultShell>
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-danger">
          {error}
        </div>
      </ResultShell>
    );
  }

  if (!mock) return null;

  const notSubmitted = mock.status === "DRAFT" || mock.status === "IN_PROGRESS";

  return (
    <ResultShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.push("/mock-interviews")}
            className="inline-flex items-center gap-2 self-start rounded-md px-2 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách mock
          </button>
          <button
            onClick={() => void loadResult()}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-elevated px-3 text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin text-accent-light" : ""}
            />
            Làm mới
          </button>
        </div>

        {notSubmitted ? (
          <NotSubmittedPanel mock={mock} />
        ) : (
          <section className="space-y-5">
            <ResultHero
              mock={mock}
              answeredCount={answeredCount}
              skippedCount={skippedCount}
              scoredCount={scoredCount}
              failedCount={failedCount}
              pendingCount={pendingCount}
              shouldPoll={shouldPoll}
            />

            <ResultSummaryPanel
              mock={mock}
              answeredCount={answeredCount}
              skippedCount={skippedCount}
              scoredCount={scoredCount}
              failedCount={failedCount}
              pendingCount={pendingCount}
            />

            <OverviewPanel mock={mock} />

            <section className="rounded-lg border border-white/10 bg-surface/70 p-4 shadow-2xl shadow-base/20 backdrop-blur-xl md:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
                    Chi tiết từng câu
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-text-primary">
                    Transcript, audio và điểm từng câu
                  </h2>
                </div>
                <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-base/70 p-1 backdrop-blur-md">
                  {FILTERS.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setFilter(item.value)}
                      className={[
                        "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                        filter === item.value
                          ? "bg-accent text-white"
                          : "text-text-secondary hover:bg-elevated hover:text-text-primary",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {visibleQuestions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                    Không có câu hỏi nào trong bộ lọc này.
                  </p>
                ) : (
                  visibleQuestions.map((item) => (
                    <QuestionResultCard key={item.id} item={item} />
                  ))
                )}
              </div>
            </section>
          </section>
        )}
      </div>
    </ResultShell>
  );
}

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] px-3 py-4 text-text-primary md:px-6 md:py-6 lg:px-8">
      {children}
    </main>
  );
}

function NotSubmittedPanel({ mock }: { mock: MockInterview }) {
  const router = useRouter();
  return (
    <section className="rounded-lg border border-white/10 bg-surface/75 p-6 text-center backdrop-blur-xl md:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-elevated text-accent-light">
        <Clock3 size={22} />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-text-primary md:text-3xl">
        Buổi mock này chưa được nộp
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Trang kết quả chỉ có dữ liệu sau khi bạn nộp bài. Hiện trạng thái là{" "}
        <span className="font-semibold text-text-primary">
          {MOCK_INTERVIEW_STATUS_LABEL[mock.status]}
        </span>
        .
      </p>
      <button
        onClick={() => router.push(`/mock-interviews/${mock.id}`)}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-bold text-white transition-all hover:bg-accent-light active:scale-[0.98]"
      >
        Vào phòng mock
      </button>
    </section>
  );
}

function ResultHero({
  mock,
  answeredCount,
  skippedCount,
  scoredCount,
  failedCount,
  pendingCount,
  shouldPoll,
}: {
  mock: MockInterview;
  answeredCount: number;
  skippedCount: number;
  scoredCount: number;
  failedCount: number;
  pendingCount: number;
  shouldPoll: boolean;
}) {
  const overall = mock.overallScore;
  const overallBand = mockInterviewScoreBand(overall);
  const overallProgress =
    overall === null ? 0 : Math.max(0, Math.min(100, overall * 10));

  return (
    <section className="rounded-lg border border-white/10 bg-surface/75 p-4 backdrop-blur-xl md:p-6">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusChip status={mock.status} />
            {shouldPoll && (
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-light">
                <Loader2 size={13} className="animate-spin" />
                Tự cập nhật
              </span>
            )}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
            Báo cáo mock interview
          </p>
          <h1 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight text-text-primary md:text-4xl">
            {mock.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            {mock.topic?.name ?? "Mock interview"} · {mock.totalQuestions} câu ·{" "}
            {formatTime(mock.durationSeconds)}
          </p>
        </div>

        <div
          className={[
            "rounded-lg border p-5 text-center shadow-lg backdrop-blur-md transition-colors duration-500 md:min-w-48",
            overallBand.borderClassName,
            overallBand.backgroundClassName,
            overallBand.shadowClassName,
          ].join(" ")}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Điểm tổng
          </p>
          <p
            className={[
              "mt-2 font-mono text-5xl font-extrabold tabular-nums transition-colors duration-500",
              overallBand.textClassName,
            ].join(" ")}
          >
            <AnimatedScoreNumber value={overall} />
          </p>
          <p className="mt-1 text-xs font-semibold text-text-secondary">
            {overallBand.label} · / 10 điểm
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border/80">
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Đã trả lời" value={answeredCount} tone="success" />
        <MetricCard label="Bỏ qua" value={skippedCount} />
        <MetricCard label="Đã chấm" value={scoredCount} tone="success" />
        <MetricCard label="Đang chấm" value={pendingCount} tone="accent" />
        <MetricCard label="Lỗi chấm" value={failedCount} tone="danger" />
      </div>
    </section>
  );
}

function AnimatedScoreNumber({ value }: { value: number | null }) {
  const [displayValue, setDisplayValue] = useState<number | null>(
    value === null ? null : 0,
  );

  useEffect(() => {
    let frame = 0;

    if (value === null) {
      frame = requestAnimationFrame(() => setDisplayValue(null));
      return () => cancelAnimationFrame(frame);
    }

    const target = Math.max(0, Math.min(10, value));
    const duration = 850;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{displayValue === null ? "—" : displayValue.toFixed(1)}</>;
}

function OverviewPanel({ mock }: { mock: MockInterview }) {
  const hasOverview =
    !!mock.summary ||
    mock.strengths.length > 0 ||
    mock.weaknesses.length > 0 ||
    mock.nextRecommendations.length > 0;

  return (
    <section className="rounded-lg border border-white/10 bg-surface/75 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
            Tổng quan AI
          </p>
          <h2 className="mt-1 text-xl font-bold text-text-primary">
            Nhận định sau buổi mock
          </h2>
        </div>
      </div>

      {!hasOverview ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-base/60 p-4 text-sm text-text-secondary">
          <Loader2 size={16} className="animate-spin text-accent-light" />
          Đang tổng hợp nhận xét tổng quan. Trang sẽ tự cập nhật khi backend
          chấm xong.
        </div>
      ) : (
        <div className="space-y-4">
          {mock.summary && (
            <blockquote className="border-l-2 border-accent pl-4 text-sm leading-7 text-text-secondary">
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
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          {mock.overviewError}
        </p>
      )}
    </section>
  );
}

function ResultSummaryPanel({
  mock,
}: {
  mock: MockInterview;
  answeredCount: number;
  skippedCount: number;
  scoredCount: number;
  failedCount: number;
  pendingCount: number;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-surface/70 p-4 shadow-2xl shadow-base/20 backdrop-blur-xl md:p-5">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
          Tổng hợp nhanh
        </p>
        <h2 className="text-xl font-bold text-text-primary">
          Điểm, tiến độ và mốc thời gian
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border col-span-2 border-white/10 bg-base/55 p-4 backdrop-blur-md">
          <p className="text-sm font-semibold text-text-primary">
            Breakdown điểm
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Trung bình các câu đã chấm thành công.
          </p>
          <div className="mt-4 space-y-4">
            <ScoreBar label="Kỹ thuật" value={mock.averageTechnicalScore} />
            <ScoreBar label="Đầy đủ" value={mock.averageCompletenessScore} />
            <ScoreBar label="Rõ ràng" value={mock.averageClarityScore} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-base/55 p-4 text-sm text-text-secondary backdrop-blur-md">
          <p className="font-semibold text-text-primary">Mốc thời gian</p>
          <div className="mt-4 space-y-2.5">
            <DateRow label="Bắt đầu" value={mock.startedAt} />
            <DateRow label="Nộp bài" value={mock.submittedAt} />
            <DateRow label="Chấm xong" value={mock.scoredAt} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-9 w-40" />
        <SkeletonBlock className="h-10 w-28" />
      </div>

      <section className="rounded-lg border border-white/10 bg-surface/70 p-5 backdrop-blur-xl md:p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_180px]">
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-10 max-w-2xl" />
            <SkeletonBlock className="h-5 max-w-lg" />
          </div>
          <SkeletonBlock className="h-32" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-20" />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-surface/70 p-5 backdrop-blur-xl">
        <SkeletonBlock className="h-6 w-52" />
        <div className="mt-4 space-y-4">
          <SkeletonBlock className="h-4" />
          <SkeletonBlock className="h-4" />
          <SkeletonBlock className="h-4" />
        </div>
      </section>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-white/10 bg-surface/70 p-4 backdrop-blur-xl"
          >
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-3 h-6 max-w-3xl" />
            <SkeletonBlock className="mt-4 h-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={[
        "skeleton-pulse rounded-lg border border-white/10 bg-elevated/80",
        className,
      ].join(" ")}
    />
  );
}

function ScorePendingSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-4" />
      <SkeletonBlock className="h-4" />
      <SkeletonBlock className="h-4" />
      <p className="text-xs text-text-muted">Đang chờ kết quả chấm.</p>
    </div>
  );
}

function QuestionResultCard({ item }: { item: MockInterviewQuestion }) {
  const score = item.session?.score ?? null;
  const average = score ? averageScore(score) : null;
  const levelStyle = LEVEL_STYLE[item.question.level];

  return (
    <article className="rounded-lg border border-white/10 bg-surface/70 p-4 shadow-2xl shadow-base/20 backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-elevated px-2 py-1 text-xs font-bold text-text-primary">
              Câu {item.order}
            </span>
            <span
              className={[
                "rounded-md px-2 py-1 text-xs font-bold",
                levelStyle.className,
              ].join(" ")}
            >
              {levelStyle.label}
            </span>
            <QuestionStatusChip item={item} />
          </div>
          <h3 className="text-base font-bold leading-relaxed text-text-primary">
            {item.question.content}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2">
          <BarChart3 size={15} className="text-text-muted" />
          <span className="font-mono text-lg font-extrabold tabular-nums text-text-primary">
            {average === null ? "—" : average.toFixed(1)}
          </span>
        </div>
      </div>

      {item.session ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 shadow-lg shadow-base/20 backdrop-blur-md">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-primary">
                <FileText size={14} className="text-text-muted" />
                Transcript
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-text-primary">
                {item.session.transcript || "Không có transcript."}
              </p>
            </div>

            {item.session.audioUrl && (
              <audio
                controls
                src={item.session.audioUrl}
                className="h-10 w-full"
              />
            )}

            {score?.summary && (
              <blockquote className="border-l-2 border-accent pl-3 text-sm leading-6 text-text-secondary">
                {score.summary}
              </blockquote>
            )}

            {item.scoreError && (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {item.scoreError}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-base/55 p-4 backdrop-blur-md">
            {score ? (
              <div className="space-y-3">
                <ScoreBar
                  label="Kỹ thuật"
                  value={score.technicalScore}
                  compact
                />
                <ScoreBar
                  label="Đầy đủ"
                  value={score.completenessScore}
                  compact
                />
                <ScoreBar label="Rõ ràng" value={score.clarityScore} compact />
                <KeywordBlock title="Đã chạm" items={score.matchedKeywords} />
                <KeywordBlock title="Còn thiếu" items={score.missedKeywords} />
                <ImprovementList items={score.improvements} />
              </div>
            ) : (
              <ScorePendingSkeleton />
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-text-muted">
          {item.answerStatus === "SKIPPED"
            ? "Câu này đã bị bỏ qua khi nộp bài."
            : "Chưa có câu trả lời cho câu này."}
        </p>
      )}
    </article>
  );
}

function StatusChip({ status }: { status: MockInterview["status"] }) {
  const badge = mockInterviewStatusBadge(status);

  return <span className={badge.className}>{badge.label}</span>;
}

function QuestionStatusChip({ item }: { item: MockInterviewQuestion }) {
  const badge = mockQuestionStatusBadge(item);

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
          : "text-text-primary";

  return (
    <div className="rounded-lg border border-white/10 bg-base/55 p-3 backdrop-blur-md">
      <p className="text-xs text-text-muted">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl font-extrabold tabular-nums ${text}`}
      >
        {value}
      </p>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text-secondary">
        {formatDateTime(value)}
      </span>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | null;
  compact?: boolean;
}) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const normalized = value === null ? 0 : Math.max(0, Math.min(10, value));
  const scoreBand = mockInterviewScoreBand(value);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setAnimatedWidth(normalized * 10),
    );
    return () => cancelAnimationFrame(frame);
  }, [normalized]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            compact
              ? "text-xs text-text-secondary"
              : "text-sm text-text-secondary"
          }
        >
          {label}
        </span>
        <span
          className={`font-mono text-sm font-bold tabular-nums ${scoreBand.textClassName}`}
        >
          {value === null ? "—" : value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBand.progressClassName}`}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
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
    <div className="rounded-lg border border-white/10 bg-base/55 p-4 backdrop-blur-md">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
        {icon}
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Chưa có dữ liệu.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex gap-2 text-sm leading-6 text-text-secondary"
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

function KeywordBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-text-secondary">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">Không có.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 8).map((item) => (
            <span
              key={item}
              className="rounded-md border border-border bg-elevated px-2 py-1 text-xs text-text-secondary"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ImprovementList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-text-secondary">
        Gợi ý cải thiện
      </p>
      <ul className="space-y-1.5">
        {items.slice(0, 3).map((item, index) => (
          <li key={index} className="text-xs leading-5 text-text-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function averageScore(score: Score) {
  return (
    (score.technicalScore + score.completenessScore + score.clarityScore) / 3
  );
}
