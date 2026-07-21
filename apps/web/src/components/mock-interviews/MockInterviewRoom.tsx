"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { usePracticeCountStore } from "@/stores/practiceCount.store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useQuota } from "@/hooks/useQuota";
import StatusModal from "@/components/ui/StatusModal";
import { audioFileNameFromBlob } from "@/lib/audioFile";
import { formatTime } from "@/lib/utils/format";
import { LEVEL_STYLE } from "@/lib/utils/levels";
import {
  answerMockQuestion,
  getMockInterview,
  startMockInterview,
  submitMockInterview,
  type MockInterview,
  type MockInterviewQuestion,
} from "@/lib/api/mockInterviews";

type UploadState = "idle" | "uploading" | "done" | "error";

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

  // Tải dữ liệu mock. Nếu mock mới tạo còn ở DRAFT thì start ngay để backend
  // chốt startedAt/expiresAt, tránh frontend tự đo thời gian lệch với server.
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
      setError(serverMsg ?? "Không thể tải mock interview.");
    } finally {
      setStarting(false);
      setLoading(false);
    }
  }, [id, router]);

  // Trang phòng mock là public route nhưng luồng làm bài bắt buộc đăng nhập.
  // Chờ auth store hydrate xong rồi mới quyết định load dữ liệu hoặc redirect.
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

  // Timer chỉ là phần hiển thị. Nguồn sự thật vẫn là expiresAt từ backend;
  // backend sẽ chặn upload câu mới khi đã quá hạn.
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

  // Khi dừng ghi âm: kiểm tra độ dài tối thiểu, upload audio cho đúng câu hiện
  // tại, rồi cập nhật state cục bộ để sidebar đổi màu mà chưa cần reload.
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
        // Khi backend đã lưu xong câu hiện tại, tự chuyển sang câu kế tiếp để
        // giữ nhịp mock interview liên tục. Nếu đang ở câu cuối thì giữ nguyên.
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

  const handleStartRecording = useCallback(async () => {
    const sound = recordStartSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      void sound.play().catch(() => {
        // Trình duyệt có thể chặn audio trong vài trường hợp; vẫn cho ghi âm bình thường.
      });
    }
    await start();
  }, [start]);

  // Reset cả recorder lẫn trạng thái upload. Nếu câu đã gửi thành công thì giữ
  // trạng thái done, vì v1 không cho làm lại câu trong cùng một mock.
  const handleRecorderReset = useCallback(() => {
    reset();
    setUploadState(
      activeQuestion?.answerStatus === "ANSWERED" ? "done" : "idle",
    );
    setUploadError("");
  }, [activeQuestion?.answerStatus, reset]);

  // Mỗi khi chuyển câu, dọn waveform/audio cũ để tránh phát lại nhầm câu trước.
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

  // Submit chỉ enqueue chấm điểm ở backend. Frontend chuyển sang trang result để
  // polling trạng thái SCORING/SCORED ở bước tiếp theo.
  function handleSubmitRequest() {
    if (!mock || submitting) return;
    // Không nộp ngay khi bấm nút: mở modal để user xác nhận vì submit sẽ khóa bài
    // và các câu chưa trả lời sẽ bị đánh dấu skipped ở backend.
    setSubmitConfirmOpen(true);
  }

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
      <RoomShell>
        <div className="flex min-h-[480px] items-center justify-center gap-3 text-text-secondary">
          <Loader2 size={18} className="animate-spin text-accent-light" />
          {starting
            ? "Đang bắt đầu mock interview..."
            : "Đang tải phòng mock..."}
        </div>
      </RoomShell>
    );
  }

  if (error && !mock) {
    return (
      <RoomShell>
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-danger">
          {error}
        </div>
      </RoomShell>
    );
  }

  if (!mock || !activeQuestion) return null;

  // Nếu mở lại phòng sau khi expiresAt đã qua, chặn vào recorder/sidebar và
  // chỉ cho user nộp bài. Backend vẫn là lớp chặn cuối cùng cho upload quá hạn.
  if (mock.status === "IN_PROGRESS" && timeIsUp) {
    return (
      <RoomShell>
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
      </RoomShell>
    );
  }

  return (
    <RoomShell>
      {/* Desktop dùng sidebar cố định bên phải; mobile dùng bottom dock riêng để
          câu hỏi vẫn chiếm chiều ngang chính và nút nộp luôn dễ bấm. */}
      <div className="lg:pr-80">
        <section
          key={activeQuestion.id}
          className="eval-enter mx-auto flex min-h-[calc(100dvh-7rem)] max-w-4xl flex-col justify-center py-4 md:py-8 lg:min-h-[calc(100dvh-5rem)]"
        >
          <div className="rounded-lg border border-white/10 bg-surface/75 p-4 backdrop-blur-xl md:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-elevated/80 px-3 py-1 text-xs font-semibold text-text-secondary">
                Câu {activeQuestion.order}/{mock.totalQuestions}
              </span>
              {activeLevelStyle && (
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    activeLevelStyle.className,
                  ].join(" ")}
                >
                  {activeLevelStyle.label}
                </span>
              )}
              {timeIsUp && (
                <span className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                  Đã hết giờ
                </span>
              )}
            </div>

            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
                Câu hỏi hiện tại
              </p>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight text-text-primary md:text-4xl">
                {activeQuestion.question.content}
              </h1>
            </div>

            <div className="mt-8">
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
              <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <QuestionMoveButton
                direction="previous"
                disabled={!canGoPrevious}
                onClick={goPrevious}
              />
              <p className="min-w-0 truncate px-2 text-center text-xs text-text-muted">
                {answeredCount}/{mock.totalQuestions} câu đã hoàn thiện
              </p>
              <QuestionMoveButton
                direction="next"
                disabled={!canGoNext}
                onClick={goNext}
              />
            </div>
          </div>
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

      <StatusModal
        open={submitConfirmOpen}
        type="alert"
        title="Nộp bài mock interview?"
        message={`Bạn đã trả lời ${answeredCount}/${mock.totalQuestions} câu. ${unansweredCount > 0 ? `${unansweredCount} câu chưa trả lời sẽ được tính là bỏ qua.` : "Tất cả câu hỏi đã được trả lời."}`}
        confirmText={submitting ? "Đang nộp..." : "Nộp bài"}
        cancelText="Xem lại"
        onClose={() => {
          if (!submitting) setSubmitConfirmOpen(false);
        }}
        onConfirm={() => {
          if (!submitting) void handleSubmit();
        }}
      />
    </RoomShell>
  );
}

function RoomShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] px-3 pb-32 pt-2 text-text-primary md:px-6 md:pb-4 md:pt-3 lg:px-8">
      {children}
    </main>
  );
}

// Sidebar desktop: cố định bên phải để người dùng luôn thấy timer, tiến độ và
// nút nộp bài dù nội dung câu hỏi/recorder ở giữa màn hình dài hơn.
function ExpiredMockPanel({
  mock,
  answeredCount,
  unansweredCount,
  submitting,
  onBack,
  onSubmit,
}: {
  mock: MockInterview;
  answeredCount: number;
  unansweredCount: number;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-2xl flex-col justify-center py-8">
      <div className="rounded-lg border border-danger/30 bg-surface/80 p-6 text-center shadow-2xl shadow-danger/5 backdrop-blur-xl md:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
          <Clock3 size={26} />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-danger">
          Đã hết thời gian
        </p>
        <h1 className="mt-3 text-2xl font-extrabold text-text-primary md:text-3xl">
          Không thể tiếp tục làm bài
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
          {`Buổi mock "${mock.title}" đã hết giờ. Bạn cần nộp bài để hệ thống chấm các câu đã trả lời.`}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-border bg-base/60 p-3 text-sm">
          <div>
            <p className="text-text-muted">Đã trả lời</p>
            <p className="mt-1 font-mono text-xl font-bold text-success">
              {answeredCount}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Bỏ qua</p>
            <p className="mt-1 font-mono text-xl font-bold text-text-primary">
              {unansweredCount}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onBack}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-elevated px-4 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={15} />
            Quay lại
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            Nộp bài
          </button>
        </div>
      </div>
    </section>
  );
}

function SubmitConfirmModal({
  open,
  mock,
  answeredCount,
  unansweredCount,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mock: MockInterview;
  answeredCount: number;
  unansweredCount: number;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <StatusModal
      open={open}
      type="alert"
      title="Nộp bài mock interview?"
      message={`Bạn đã trả lời ${answeredCount}/${mock.totalQuestions} câu. ${unansweredCount > 0 ? `${unansweredCount} câu chưa trả lời sẽ được tính là bỏ qua.` : "Tất cả câu hỏi đã được trả lời."}`}
      confirmText={submitting ? "Đang nộp..." : "Nộp bài"}
      cancelText="Xem lại"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function ProgressSidebar({
  mock,
  remaining,
  answeredCount,
  activeIndex,
  orderedQuestions,
  submitting,
  onBack,
  onSelect,
  onSubmit,
}: {
  mock: MockInterview;
  remaining: number | null;
  answeredCount: number;
  activeIndex: number;
  orderedQuestions: MockInterviewQuestion[];
  submitting: boolean;
  onBack: () => void;
  onSelect: (index: number) => void;
  onSubmit: () => void;
}) {
  return (
    <aside className="fixed bottom-0 right-0 top-14 z-30 hidden w-80 border-l border-white/10 bg-surface/70 p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 self-start rounded-md px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={15} />
        Quay lại
      </button>

      <div className="rounded-lg border border-border bg-elevated/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {mock.topic?.name ?? "Mock interview"}
        </p>
        <h2 className="mt-2 line-clamp-3 text-base font-bold leading-snug text-text-primary">
          {mock.title}
        </h2>

        <div className="mt-5 rounded-lg border border-white/10 bg-base/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
              <Clock3 size={16} className="text-accent-light" />
              Thời gian
            </span>
            <span className="animate-pulse font-mono text-2xl font-extrabold tabular-nums text-text-primary">
              {remaining === null ? "--:--" : formatTime(remaining)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-text-secondary">
            <ListChecks size={16} className="text-text-muted" />
            Hoàn thiện
          </span>
          <span className="font-mono font-bold tabular-nums text-text-primary">
            {answeredCount}/{mock.totalQuestions}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {orderedQuestions.map((item, index) => (
          <QuestionNavItem
            key={item.id}
            item={item}
            active={index === activeIndex}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
        Nộp bài
      </button>
    </aside>
  );
}

// Mobile dock: gom timer, tiến độ, nộp bài và lưới câu vào cuối màn hình để
// thao tác bằng ngón cái thuận hơn, đồng thời không làm câu hỏi bị bóp ngang.
function MobileBottomDock({
  mock,
  remaining,
  answeredCount,
  activeIndex,
  orderedQuestions,
  submitting,
  onSelect,
  onSubmit,
}: {
  mock: MockInterview;
  remaining: number | null;
  answeredCount: number;
  activeIndex: number;
  orderedQuestions: MockInterviewQuestion[];
  submitting: boolean;
  onSelect: (index: number) => void;
  onSubmit: () => void;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface/80 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-text-muted">
            {mock.topic?.name ?? "Mock interview"}
          </p>
          <p className="mt-0.5 animate-pulse font-mono text-xl font-extrabold tabular-nums text-text-primary">
            {remaining === null ? "--:--" : formatTime(remaining)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Hoàn thiện</p>
          <p className="font-mono text-sm font-bold tabular-nums text-text-primary">
            {answeredCount}/{mock.totalQuestions}
          </p>
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Nộp
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {orderedQuestions.map((item, index) => (
          <QuestionNavItem
            key={item.id}
            item={item}
            active={index === activeIndex}
            compact
            onClick={() => onSelect(index)}
          />
        ))}
      </div>
    </aside>
  );
}

// Nút chuyển câu trong vùng nội dung chính. Sidebar/dock vẫn là điều hướng nhanh
// theo số câu, còn hai nút này phục vụ đọc tuần tự từng câu.
function QuestionMoveButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const label = direction === "previous" ? "Câu trước" : "Câu sau";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-elevated px-3 text-sm font-semibold text-text-secondary transition-all duration-200 hover:border-accent hover:text-text-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary"
    >
      {direction === "previous" && <Icon size={17} />}
      <span className="hidden sm:inline">{label}</span>
      {direction === "next" && <Icon size={17} />}
    </button>
  );
}

// Ô câu hỏi chỉ hiện số để sidebar gọn. Viền xanh thể hiện đã lưu câu trả lời,
// viền tím là câu đang được mở.
function QuestionNavItem({
  item,
  active,
  compact = false,
  onClick,
}: {
  item: MockInterviewQuestion;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const answered = item.answerStatus === "ANSWERED";

  return (
    <button
      onClick={onClick}
      aria-label={`Chuyển đến câu ${item.order}`}
      className={[
        "flex aspect-square shrink-0 items-center justify-center rounded-md border text-xs font-bold tabular-nums transition-all duration-200 active:scale-95",
        compact ? "h-9 w-9" : "min-h-10",
        answered
          ? "border-success bg-success/10 text-success"
          : active
            ? "border-accent bg-accent/10 text-text-primary"
            : "border-border bg-base/70 text-text-secondary hover:border-accent hover:text-text-primary",
      ].join(" ")}
    >
      {item.order}
    </button>
  );
}

// Recorder dùng chung hook useAudioRecorder. recordContainerRef phải luôn mounted
// trước khi bấm ghi âm, nên waveform recording được ẩn bằng CSS thay vì unmount.
function RecorderPanel({
  canRecord,
  recorderStatus,
  elapsed,
  errorMsg,
  uploadState,
  uploadError,
  isPlaying,
  recordContainerRef,
  playbackContainerRef,
  onStart,
  onStop,
  onReset,
  onTogglePlayback,
  timeIsUp,
}: {
  canRecord: boolean;
  recorderStatus: "idle" | "recording" | "error";
  elapsed: number;
  errorMsg: string;
  uploadState: UploadState;
  uploadError: string;
  isPlaying: boolean;
  recordContainerRef: React.RefObject<HTMLDivElement | null>;
  playbackContainerRef: React.RefObject<HTMLDivElement | null>;
  onStart: () => Promise<void>;
  onStop: () => void;
  onReset: () => void;
  onTogglePlayback: () => void;
  timeIsUp: boolean;
}) {
  if (timeIsUp) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
        Đã hết thời gian. Bạn không thể gửi câu mới, hãy nộp bài để chấm các câu
        đã trả lời.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-base/55 p-4 backdrop-blur-md md:p-6">
      {recorderStatus === "idle" && uploadState === "idle" && (
        <div className="flex flex-col items-center gap-4 py-8 md:py-10">
          <button
            onClick={onStart}
            disabled={!canRecord}
            className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-accent text-white shadow-2xl shadow-accent/20 transition-all duration-200 hover:bg-accent-light hover:shadow-accent/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:h-24 md:w-24"
          >
            <Mic size={34} />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-text-primary">
              Nhấn để ghi câu trả lời
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Tối thiểu {MIN_DURATION} giây trước khi hệ thống nhận bài.
            </p>
          </div>
        </div>
      )}

      <div
        className={
          recorderStatus === "recording" && uploadState === "idle"
            ? "flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4"
            : "pointer-events-none h-12 overflow-hidden opacity-0"
        }
      >
        <span className="flex items-center gap-1.5 text-xs font-bold text-danger">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
          REC
        </span>
        <div ref={recordContainerRef} className="min-w-[160px] flex-1" />
        <span className="font-mono text-lg font-bold tabular-nums text-text-primary md:text-xl">
          {formatTime(elapsed)}
        </span>
        <button
          onClick={onReset}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-elevated transition-colors hover:text-text-primary"
          title="Hủy ghi âm"
        >
          <X size={16} className="text-text-secondary" />
        </button>
        <button
          onClick={onStop}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-danger text-white transition-transform active:scale-95"
          title="Dừng và gửi"
        >
          <Square size={16} fill="white" className="text-white" />
        </button>
      </div>

      {uploadState === "uploading" && (
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-text-secondary">
          <Loader2 size={16} className="animate-spin text-accent-light" />
          Đang phiên âm và lưu câu trả lời...
        </div>
      )}

      {uploadState === "done" && (
        <div className="flex items-center justify-center gap-3 py-6 text-sm text-success">
          <CheckCircle2 size={16} />
          Đã lưu câu trả lời.
        </div>
      )}

      {uploadState === "error" && uploadError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle size={15} className="mt-0.5" />
          {uploadError}
        </div>
      )}

      {recorderStatus === "error" && errorMsg && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle size={15} className="mt-0.5" />
          {errorMsg}
        </div>
      )}

      {uploadState !== "idle" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 md:flex-nowrap">
          <button
            onClick={onTogglePlayback}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated transition-colors hover:border-accent"
          >
            {isPlaying ? (
              <Pause size={12} className="text-white" />
            ) : (
              <Play size={12} className="text-accent-light" />
            )}
          </button>
          <div ref={playbackContainerRef} className="min-w-[160px] flex-1" />
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-secondary"
          >
            <RotateCcw size={12} />
            ghi lại
          </button>
        </div>
      )}
    </div>
  );
}

// Sau khi trả lời xong, chỉ cho nghe lại audio; transcript sẽ để dành cho trang kết quả.
function AnsweredPanel({
  audioUrl,
  duration,
}: {
  audioUrl: string;
  duration: number | null;
}) {
  return (
    <div className="rounded-lg border border-success/20 bg-success/5 p-5">
      <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-success">
        <CheckCircle2 size={16} />
        Câu này đã được ghi nhận
      </div>
      {audioUrl ? (
        <div className="mx-auto max-w-2xl">
          <audio controls src={audioUrl} className="h-11 w-full" />
          {duration !== null && (
            <p className="mt-2 text-center text-xs text-text-muted">
              Thời lượng: {formatTime(duration)}
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-text-secondary">
          Đã lưu câu trả lời. Audio sẽ hiển thị sau khi tải lại dữ liệu.
        </p>
      )}
    </div>
  );
}
