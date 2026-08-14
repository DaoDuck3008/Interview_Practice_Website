"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, RefreshCw } from "lucide-react";
import axios from "axios";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/stores/auth.store";
import type { InterviewSessionView } from "@/lib/interview-core/types";
import { MOCK_INTERVIEW_STATUS_LABEL } from "@/lib/utils/mockInterview";
import {
  MockResultShell,
  ResultGlassPanel,
  ScoringResultSkeleton,
  ResultSkeleton,
} from "./MockResultShell";
import { QuestionResultsSection } from "./MockResultQuestions";
import {
  OverviewPanel,
  ResultHero,
  ResultSummaryPanel,
} from "./MockResultSummary";
import type { QuestionFilter } from "./types";

export interface InterviewResultPayload<TDetails = never> {
  session: InterviewSessionView;
  details?: TDetails;
}

export interface InterviewResultSessionProps<TDetails = never> {
  id: string;
  listPath: string;
  roomPath: string;
  resultPath: string;
  fetchResult: (id: string) => Promise<InterviewResultPayload<TDetails>>;
  retryScoring: (id: string) => Promise<InterviewResultPayload<TDetails>>;
  scoredEvent: string;
  failedEvent?: string;
  renderDetails?: (details: TDetails | undefined) => ReactNode;
}

interface ScoringEventPayload {
  mockInterviewId?: string;
  mockCvInterviewId?: string;
}

export default function InterviewResultSession<TDetails = never>({
  id,
  listPath,
  roomPath,
  resultPath,
  fetchResult,
  retryScoring,
  scoredEvent,
  failedEvent,
  renderDetails,
}: InterviewResultSessionProps<TDetails>) {
  const router = useRouter();
  const socket = useSocket();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [mock, setMock] = useState<InterviewSessionView | null>(null);
  const [details, setDetails] = useState<TDetails | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<QuestionFilter>("ALL");

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [id]);

  // Tải báo cáo từ đúng nguồn phỏng vấn; phần trình bày được dùng chung để giữ trải nghiệm nhất quán.
  const loadResult = useCallback(
    async (options: { initial?: boolean } = {}) => {
      if (options.initial) setLoading(true);
      else setRefreshing(true);
      setError("");
      try {
        const data = await fetchResult(id);
        setMock(data.session);
        setDetails(data.details);
        setLastCheckedAt(Date.now());
      } catch (err) {
        const status = axios.isAxiosError(err)
          ? err.response?.status
          : undefined;
        if (status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(resultPath)}`);
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
    [fetchResult, id, resultPath, router],
  );

  // Chỉ load result sau khi auth store hydrate xong để tránh redirect sai trong route cần đăng nhập.
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(resultPath)}`);
      return;
    }
    queueMicrotask(() => {
      void loadResult({ initial: true });
    });
  }, [hydrated, user, id, router, loadResult, resultPath]);

  useEffect(() => {
    if (!socket) return;

    const belongsToCurrentInterview = (payload: ScoringEventPayload) =>
      (payload.mockInterviewId ?? payload.mockCvInterviewId) === id;
    const handleScored = (payload: ScoringEventPayload) => {
      if (belongsToCurrentInterview(payload)) void loadResult();
    };
    const handleFailed = (payload: ScoringEventPayload) => {
      if (belongsToCurrentInterview(payload)) void loadResult();
    };
    const handleReconnect = () => void loadResult();

    socket.on(scoredEvent, handleScored);
    if (failedEvent) socket.on(failedEvent, handleFailed);
    socket.on("connect", handleReconnect);
    return () => {
      socket.off(scoredEvent, handleScored);
      if (failedEvent) socket.off(failedEvent, handleFailed);
      socket.off("connect", handleReconnect);
    };
  }, [failedEvent, id, loadResult, scoredEvent, socket]);

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
      <MockResultShell>
        <ResultSkeleton />
      </MockResultShell>
    );
  }

  if (error && !mock) {
    return (
      <MockResultShell>
        <div className="mx-auto max-w-2xl rounded-3xl border border-danger/30 bg-danger/10 p-6 text-danger shadow-2xl shadow-danger/10 backdrop-blur-2xl">
          {error}
        </div>
      </MockResultShell>
    );
  }

  if (!mock) return null;

  const notSubmitted = mock.status === "DRAFT" || mock.status === "IN_PROGRESS";
  const awaitingResult = !notSubmitted && mock.status !== "SCORED";
  const isScoringStale =
    (mock.status === "SCORING" || mock.status === "SUBMITTED") &&
    !!mock.updatedAt &&
    lastCheckedAt !== null &&
    lastCheckedAt - new Date(mock.updatedAt).getTime() >= 2 * 60 * 1000;
  const canRetryScoring =
    failedCount > 0 ||
    mock.overviewStatus === "FAILED" ||
    (isScoringStale &&
      questions.some(
        (question) =>
          question.scoreStatus === "QUEUED" && !question.session?.score,
      ));
  const counts = {
    answeredCount,
    skippedCount,
    scoredCount,
    failedCount,
    pendingCount,
  };

  async function handleRetryScoring() {
    setRetrying(true);
    setError("");
    try {
      const data = await retryScoring(mock!.id);
      setMock(data.session);
      setDetails(data.details);
      setLastCheckedAt(Date.now());
    } catch (err) {
      const serverMsg = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : undefined;
      setError(
        serverMsg ?? "Không thể chấm lại lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <MockResultShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.push(listPath)}
            className="inline-flex h-10 items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.045] px-3 text-sm font-bold text-white/65 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách mock
          </button>
          <button
            onClick={() => void loadResult()}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 text-sm font-bold text-white/65 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin text-violet-200" : ""}
            />
            Làm mới
          </button>
          {canRetryScoring && (
            <button
              onClick={() => void handleRetryScoring()}
              disabled={retrying}
              title="Chấm lại khi có câu không được chấm"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-3 text-sm font-bold text-danger backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={retrying ? "animate-spin" : ""} />
              {retrying
                ? "Đang gửi chấm lại..."
                : failedCount > 0
                  ? "Chấm lại câu lỗi"
                  : "Thử chấm lại"}
            </button>
          )}
        </div>

        {notSubmitted ? (
          <NotSubmittedPanel mock={mock} roomPath={roomPath} />
        ) : awaitingResult ? (
          <section className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            <ScoringResultSkeleton />
          </section>
        ) : (
          <section className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            <ResultHero mock={mock} counts={counts} />

            <div className="space-y-5">
              <ResultSummaryPanel mock={mock} />
              <OverviewPanel mock={mock} />
              {renderDetails?.(details)}
            </div>

            <QuestionResultsSection
              filter={filter}
              onFilterChange={setFilter}
              visibleQuestions={visibleQuestions}
            />
          </section>
        )}
      </div>
    </MockResultShell>
  );
}

function NotSubmittedPanel({
  mock,
  roomPath,
}: {
  mock: InterviewSessionView;
  roomPath: string;
}) {
  const router = useRouter();
  return (
    <ResultGlassPanel className="p-6 text-center md:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-violet-200">
        <Clock3 size={24} />
      </div>
      <h1 className="mt-5 text-2xl font-black text-white md:text-3xl">
        Buổi mock này chưa được nộp
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/62">
        Trang kết quả chỉ có dữ liệu sau khi bạn nộp bài. Hiện trạng thái là{" "}
        <span className="font-bold text-white">
          {MOCK_INTERVIEW_STATUS_LABEL[mock.status]}
        </span>
        .
      </p>
      <button
        onClick={() => router.push(roomPath)}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-violet-100 px-5 text-sm font-black text-slate-950 shadow-xl shadow-violet-950/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white active:scale-[0.98]"
      >
        Vào phòng mock
      </button>
    </ResultGlassPanel>
  );
}
