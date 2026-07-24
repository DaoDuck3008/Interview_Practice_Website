"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, RefreshCw } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import {
  getMockInterviewResult,
  type MockInterview,
} from "@/lib/api/mockInterviews";
import { MOCK_INTERVIEW_STATUS_LABEL } from "@/lib/utils/mockInterview";
import { MockResultShell, ResultGlassPanel, ResultSkeleton } from "./MockResultShell";
import { QuestionResultsSection } from "./MockResultQuestions";
import {
  OverviewPanel,
  ResultHero,
  ResultSummaryPanel,
} from "./MockResultSummary";
import type { QuestionFilter } from "./types";

export default function MockInterviewResult({ id }: { id: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [mock, setMock] = useState<MockInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<QuestionFilter>("ALL");

  // Tải kết quả cho trang /mock-interviews/[id]/result; dùng lại cho cả lần đầu và nút refresh.
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

  // Chỉ load result sau khi auth store hydrate xong để tránh redirect sai trong route cần đăng nhập.
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

  // Khi backend còn đang chấm, trang tự polling để người dùng không phải bấm làm mới thủ công.
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
  const counts = {
    answeredCount,
    skippedCount,
    scoredCount,
    failedCount,
    pendingCount,
  };

  return (
    <MockResultShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.push("/mock-interviews")}
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
        </div>

        {notSubmitted ? (
          <NotSubmittedPanel mock={mock} />
        ) : (
          <section className="space-y-5">
            <ResultHero mock={mock} counts={counts} shouldPoll={shouldPoll} />

            <div className="space-y-5">
              <ResultSummaryPanel mock={mock} />
              <OverviewPanel mock={mock} />
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

function NotSubmittedPanel({ mock }: { mock: MockInterview }) {
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
        onClick={() => router.push(`/mock-interviews/${mock.id}`)}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-violet-100 px-5 text-sm font-black text-slate-950 shadow-xl shadow-violet-950/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white active:scale-[0.98]"
      >
        Vào phòng mock
      </button>
    </ResultGlassPanel>
  );
}
