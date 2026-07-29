"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useQuota } from "@/hooks/useQuota";
import {
  answerMockQuestion,
  getMockInterview,
  startMockInterview,
  submitMockInterview,
  type MockInterview,
} from "@/lib/api/mockInterviews";
import { audioFileNameFromBlob } from "@/lib/audioFile";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import { usePracticeCountStore } from "@/stores/practiceCount.store";
import { useAuthStore } from "@/stores/auth.store";
import StatusModal from "@/components/ui/StatusModal";
import { MockQuestionArticle } from "./MockRoomShell";
import { QuestionMoveButton, TimerPill, TopicBadge } from "./MockRoomHeader";
import { ExpiredMockPanel, SubmitConfirmModal } from "./MockRoomPanels";
import { MobileBottomDock, ProgressSidebar } from "./MockRoomProgress";
import { AnsweredPanel, RecorderPanel } from "./MockRoomRecorder";
import type { UploadState } from "./types";

const MIN_DURATION = 10;

export default function MockInterviewRoom({ id }: { id: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const { refresh: refreshQuota } = useQuota();
  const refreshPracticeCount = usePracticeCountStore((s) => s.refresh);

  const [mock, setMock] = useState<MockInterview | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [backWarningOpen, setBackWarningOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const recordStartSoundRef = useRef<HTMLAudioElement | null>(null);

  const activeQuestion = mock?.questions?.[activeIndex] ?? null;
  const activeLevelStyle = activeQuestion
    ? LEVEL_STYLE[activeQuestion.question.level]
    : null;
  const answeredCount =
    mock?.questions?.filter((q) => q.answerStatus === "ANSWERED").length ?? 0;
  const unansweredCount = Math.max(
    0,
    (mock?.totalQuestions ?? 0) - answeredCount,
  );

  useEffect(() => {
    recordStartSoundRef.current = new Audio("/sounds/record_start.mp3");
    recordStartSoundRef.current.preload = "auto";
  }, []);

  // Tải dữ liệu cho trang /mock-interviews/[id]; mock ở DRAFT sẽ được start ngay để backend chốt thời gian.
  const loadMock = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      let data = await getMockInterview(id);
      if (data.status === "DRAFT") {
        setStarting(true);
        data = await startMockInterview(id);
        setStarting(false);
      }
      if (
        data.status === "IN_PROGRESS" &&
        data.expiresAt &&
        new Date(data.expiresAt).getTime() <= Date.now()
      ) {
        setRemaining(0);
      }
      setMock(data);
      const firstPending = data.questions?.findIndex(
        (q) => q.answerStatus !== "ANSWERED",
      );
      setActiveIndex(firstPending && firstPending >= 0 ? firstPending : 0);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/mock-interviews/${id}`)}`,
        );
        return;
      }
      const serverMsg = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : undefined;
      setError(serverMsg ?? "Không thể tải phòng mock interview.");
    } finally {
      setStarting(false);
      setLoading(false);
    }
  }, [id, router]);

  // Chờ auth hydrate xong rồi mới load phòng mock, tránh gọi API khi chưa biết trạng thái đăng nhập.
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/mock-interviews/${id}`)}`,
      );
      return;
    }
    queueMicrotask(() => {
      void loadMock();
    });
  }, [hydrated, user, id, router, loadMock]);

  // Timer chỉ là hiển thị theo expiresAt từ backend; backend vẫn là nguồn chặn upload khi quá hạn.
  useEffect(() => {
    const expiresAt = mock?.expiresAt;
    if (!expiresAt || mock?.status !== "IN_PROGRESS") {
      queueMicrotask(() => setRemaining(null));
      return;
    }
    const deadlineMs = new Date(expiresAt).getTime();

    function tick() {
      const left = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setRemaining(left);
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [mock?.expiresAt, mock?.status]);

  // Upload audio cho câu hiện tại, cập nhật state local và tự chuyển sang câu kế tiếp nếu còn.
  const handleRecordingComplete = useCallback(
    async (blob: Blob, duration: number) => {
      if (!mock || !activeQuestion) return;
      if (duration < MIN_DURATION) {
        setUploadState("error");
        setUploadError("Bản ghi quá ngắn, hãy trả lời dài hơn một chút.");
        return;
      }

      setUploadState("uploading");
      setUploadError("");
      try {
        const formData = new FormData();
        formData.append(
          "audio",
          blob,
          audioFileNameFromBlob(blob, "mock-answer"),
        );
        formData.append("duration", String(duration));
        const session = await answerMockQuestion(
          mock.id,
          activeQuestion.id,
          formData,
        );

        setMock((current) => {
          if (!current?.questions) return current;
          return {
            ...current,
            questions: current.questions.map((item) =>
              item.id === activeQuestion.id
                ? {
                    ...item,
                    answerStatus: "ANSWERED",
                    answeredAt: session.createdAt,
                    session: {
                      id: session.id,
                      audioUrl: session.audioUrl,
                      transcript: session.transcript,
                      duration: session.duration,
                      createdAt: session.createdAt,
                      score: null,
                    },
                  }
                : item,
            ),
          };
        });
        const hasNextQuestion = activeIndex < (mock.questions?.length ?? 0) - 1;
        setActiveIndex((current) =>
          hasNextQuestion
            ? Math.min(current + 1, (mock.questions?.length ?? 1) - 1)
            : current,
        );
        setUploadState(hasNextQuestion ? "idle" : "done");
        refreshQuota();
        refreshPracticeCount();
      } catch (err) {
        const serverMsg = axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined)
          : undefined;
        setUploadState("error");
        setUploadError(serverMsg ?? "Không thể gửi câu trả lời.");
      }
    },
    [activeIndex, activeQuestion, mock, refreshPracticeCount, refreshQuota],
  );

  const {
    recordContainerRef,
    playbackContainerRef,
    status: recorderStatus,
    elapsed,
    isPlaying,
    errorMsg,
    start,
    stop,
    togglePlayback,
    reset,
  } = useAudioRecorder({ onComplete: handleRecordingComplete });

  // Phát âm thanh báo hiệu ngắn trước khi bắt đầu ghi âm câu trả lời.
  const handleStartRecording = useCallback(async () => {
    const sound = recordStartSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      void sound.play().catch(() => {
        // Một số trình duyệt chặn âm thanh ngắn; việc ghi âm vẫn tiếp tục bình thường.
      });
    }
    await start();
  }, [start]);

  // Reset waveform và trạng thái upload khi người dùng đổi câu hoặc ghi lại.
  const handleRecorderReset = useCallback(() => {
    reset();
    setUploadState(
      activeQuestion?.answerStatus === "ANSWERED" ? "done" : "idle",
    );
    setUploadError("");
  }, [activeQuestion?.answerStatus, reset]);

  useEffect(() => {
    queueMicrotask(() => {
      handleRecorderReset();
      setUploadState(
        activeQuestion?.answerStatus === "ANSWERED" ? "done" : "idle",
      );
      setUploadError("");
    });
  }, [activeQuestion?.id, activeQuestion?.answerStatus, handleRecorderReset]);

  const timeIsUp = remaining === 0;
  const canRecord =
    mock?.status === "IN_PROGRESS" &&
    !timeIsUp &&
    activeQuestion?.answerStatus !== "ANSWERED" &&
    uploadState !== "uploading";

  // Mở modal xác nhận để người dùng thấy số câu chưa trả lời trước khi nộp bài.
  function handleSubmitRequest() {
    if (!mock || submitting) return;
    setSubmitConfirmOpen(true);
  }

  // Gửi lệnh nộp bài lên backend rồi chuyển sang trang kết quả để polling trạng thái chấm điểm.
  async function handleSubmit() {
    if (!mock) return;
    setSubmitConfirmOpen(false);
    setSubmitting(true);
    setError("");
    try {
      await submitMockInterview(mock.id);
      router.push(`/mock-interviews/${mock.id}/result`);
    } catch (err) {
      const serverMsg = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : undefined;
      setError(serverMsg ?? "Không thể nộp bài.");
    } finally {
      setSubmitting(false);
    }
  }

  const orderedQuestions = useMemo(
    () => mock?.questions ?? [],
    [mock?.questions],
  );
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < orderedQuestions.length - 1;

  function goPrevious() {
    if (!canGoPrevious) return;
    setActiveIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    if (!canGoNext) return;
    setActiveIndex((index) => Math.min(orderedQuestions.length - 1, index + 1));
  }

  if (!hydrated || loading) {
    return (
      <>
        <div className="mx-auto flex min-h-[460px] max-w-3xl items-center justify-center">
          <div className="rounded-full border border-white/15 bg-white/[0.07] px-5 py-3 text-sm font-semibold text-white/80 shadow-2xl shadow-violet-950/30 backdrop-blur-2xl">
            <span className="inline-flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-violet-200" />
              {starting
                ? "Đang bắt đầu mock interview..."
                : "Đang tải phòng mock..."}
            </span>
          </div>
        </div>
      </>
    );
  }

  if (error && !mock) {
    return (
      <>
        <div className="mx-auto max-w-2xl rounded-3xl border border-danger/30 bg-danger/10 p-6 text-danger shadow-2xl shadow-danger/10 backdrop-blur-2xl">
          {error}
        </div>
      </>
    );
  }

  if (!mock || !activeQuestion) return null;

  if (mock.status === "IN_PROGRESS" && timeIsUp) {
    return (
      <>
        <ExpiredMockPanel
          mock={mock}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          submitting={submitting}
          onBack={() => router.push("/mock-interviews")}
          onSubmit={handleSubmitRequest}
        />

        <SubmitConfirmModal
          open={submitConfirmOpen}
          mock={mock}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          submitting={submitting}
          onClose={() => {
            if (!submitting) setSubmitConfirmOpen(false);
          }}
          onConfirm={() => {
            if (!submitting) void handleSubmit();
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="lg:pr-[21.5rem]">
        <section
          key={activeQuestion.id}
          className="eval-enter mx-auto flex min-h-[calc(100dvh-10rem)] max-w-5xl flex-col justify-center py-3 md:py-5"
        >
          <MockQuestionArticle>
            <div className="relative border-b border-white/10 px-4 py-3 md:px-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(221,214,254,0.18),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.16),transparent_34%)]" />
              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TopicBadge
                    mock={mock}
                    questionTopic={activeQuestion.question.topic}
                  />
                  <span className="rounded-full border border-white/15 bg-white/[0.055] px-3 py-1 text-xs font-bold text-white/75 backdrop-blur-xl">
                    Câu {activeQuestion.order}/{mock.totalQuestions}
                  </span>
                  {activeLevelStyle && (
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-xl",
                        activeLevelStyle.className,
                      ].join(" ")}
                    >
                      {activeLevelStyle.label}
                    </span>
                  )}
                </div>

                <TimerPill remaining={remaining} />
              </div>
            </div>

            <div className="px-4 py-5 md:px-5 md:py-7">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/80">
                  Câu hỏi hiện tại
                </p>
                <h1 className="mt-3 text-balance bg-[linear-gradient(180deg,#ffffff_0%,#ddd6fe_55%,rgba(196,181,253,0.84)_100%)] bg-clip-text text-2xl font-black leading-tight text-transparent md:text-3xl">
                  {activeQuestion.question.content}
                </h1>
              </div>

              <div className="mt-6">
                {activeQuestion.answerStatus === "ANSWERED" ? (
                  <AnsweredPanel
                    audioUrl={activeQuestion.session?.audioUrl ?? ""}
                    duration={activeQuestion.session?.duration ?? null}
                  />
                ) : (
                  <RecorderPanel
                    canRecord={canRecord}
                    recorderStatus={recorderStatus}
                    elapsed={elapsed}
                    errorMsg={errorMsg}
                    uploadState={uploadState}
                    uploadError={uploadError}
                    isPlaying={isPlaying}
                    recordContainerRef={recordContainerRef}
                    playbackContainerRef={playbackContainerRef}
                    onStart={handleStartRecording}
                    onStop={stop}
                    onReset={handleRecorderReset}
                    onTogglePlayback={togglePlayback}
                    timeIsUp={timeIsUp}
                  />
                )}
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger backdrop-blur-xl">
                  {error}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <QuestionMoveButton
                  direction="previous"
                  disabled={!canGoPrevious}
                  onClick={goPrevious}
                />
                <p className="min-w-0 truncate px-2 text-center text-xs font-semibold text-white/45">
                  {answeredCount}/{mock.totalQuestions} câu đã hoàn thiện
                </p>
                <QuestionMoveButton
                  direction="next"
                  disabled={!canGoNext}
                  onClick={goNext}
                />
              </div>
            </div>
          </MockQuestionArticle>
        </section>

        <ProgressSidebar
          mock={mock}
          remaining={remaining}
          answeredCount={answeredCount}
          activeIndex={activeIndex}
          orderedQuestions={orderedQuestions}
          submitting={submitting}
          onBack={() => setBackWarningOpen(true)}
          onSelect={setActiveIndex}
          onSubmit={handleSubmitRequest}
        />

        <MobileBottomDock
          mock={mock}
          remaining={remaining}
          answeredCount={answeredCount}
          activeIndex={activeIndex}
          orderedQuestions={orderedQuestions}
          submitting={submitting}
          onSelect={setActiveIndex}
          onSubmit={handleSubmitRequest}
        />
      </div>

      <StatusModal
        open={backWarningOpen}
        type="alert"
        title="Rời phòng mock?"
        message="Thời gian của buổi mock vẫn tiếp tục chạy kể cả khi bạn rời trang này."
        confirmText="Vẫn quay lại"
        cancelText="Ở lại"
        onClose={() => setBackWarningOpen(false)}
        onConfirm={() => {
          setBackWarningOpen(false);
          router.push("/mock-interviews");
        }}
      />

      <SubmitConfirmModal
        open={submitConfirmOpen}
        mock={mock}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        submitting={submitting}
        onClose={() => {
          if (!submitting) setSubmitConfirmOpen(false);
        }}
        onConfirm={() => {
          if (!submitting) void handleSubmit();
        }}
      />
    </>
  );
}
