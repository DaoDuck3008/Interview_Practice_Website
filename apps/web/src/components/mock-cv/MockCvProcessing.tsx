"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleCheckBig,
  FileSearch2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  UploadCloud,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import {
  getMockCv,
  retryMockCvAnalysis,
  startMockCvInterview,
  type MockCv,
} from "@/lib/api/mockCvs";
import { toastApiError } from "@/lib/utils/apiError";
import { useSocket } from "@/hooks/useSocket";

interface MockCvRealtimePayload {
  mockCvId?: string;
  analysisId: string;
}

const PREPARATION_STAGES: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Đã nhận CV",
    description: "File và cấu hình bài luyện đã được lưu an toàn.",
    icon: UploadCloud,
  },
  {
    title: "Đọc hồ sơ",
    description: "Xác định kinh nghiệm, kỹ năng và dự án nổi bật.",
    icon: FileSearch2,
  },
  {
    title: "Đang chuẩn bị câu hỏi",
    description: "Kết hợp question bank với câu hỏi cá nhân hóa từ CV.",
    icon: Sparkles,
  },
  {
    title: "Sẵn sàng luyện tập",
    description: "Bạn sẽ được chuyển vào phòng phỏng vấn tự động.",
    icon: CircleCheckBig,
  },
];

export default function MockCvProcessing({ id }: { id: string }) {
  const router = useRouter();
  const socket = useSocket();
  const [cv, setCv] = useState<MockCv | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [starting, setStarting] = useState(false);
  const startLockRef = useRef(false);

  const loadCv = useCallback(async () => {
    try {
      const item = await getMockCv(id);
      setCv(item);
      setError("");
    } catch (loadError) {
      setError(
        toastApiError(
          loadError,
          "Không thể đọc trạng thái chuẩn bị. Vui lòng kiểm tra lại.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void loadCv());
  }, [loadCv]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (payload: MockCvRealtimePayload) => {
      if (payload.mockCvId === id || payload.analysisId === cv?.analysis?.id) {
        void loadCv();
      }
    };
    const handleReconnect = () => void loadCv();

    socket.on("mock-cv:analysis-updated", handleUpdate);
    socket.on("mock-cv:questions-updated", handleUpdate);
    socket.on("connect", handleReconnect);
    queueMicrotask(() => void loadCv());
    return () => {
      socket.off("mock-cv:analysis-updated", handleUpdate);
      socket.off("mock-cv:questions-updated", handleUpdate);
      socket.off("connect", handleReconnect);
    };
  }, [cv?.analysis?.id, id, loadCv, socket]);

  const enterInterview = useCallback(async () => {
    if (startLockRef.current) return;
    startLockRef.current = true;
    setStarting(true);
    try {
      const result = await startMockCvInterview(id);
      if (result.status === "STARTED") {
        router.replace(`/mock-cv/interviews/${result.interview.id}`);
        return;
      }
      await loadCv();
    } catch (startError) {
      setError(
        toastApiError(
          startError,
          "Chưa thể mở phòng phỏng vấn. Vui lòng thử lại.",
        ),
      );
    } finally {
      startLockRef.current = false;
      setStarting(false);
    }
  }, [id, loadCv, router]);

  const preparationReady =
    cv?.analysis?.status === "READY" &&
    cv.analysis.questionGenerationStatus === "READY";
  const automaticActionStatus =
    cv?.analysis?.status === "READY" &&
    (cv.analysis.questionGenerationStatus === "PENDING" ||
      cv.analysis.questionGenerationStatus === "READY")
      ? cv.analysis.questionGenerationStatus
      : null;

  useEffect(() => {
    if (automaticActionStatus) {
      queueMicrotask(() => void enterInterview());
    }
  }, [automaticActionStatus, enterInterview]);

  const progress = useMemo(() => resolveProgress(cv), [cv]);
  const failure = resolveFailure(cv);

  async function handleRetry() {
    if (!cv?.analysis || retrying) return;
    setRetrying(true);
    setError("");
    try {
      if (cv.analysis.status === "FAILED" || cv.analysis.isStale) {
        setCv(await retryMockCvAnalysis(id));
      } else {
        await enterInterview();
      }
    } catch (retryError) {
      toastApiError(retryError, "Chưa thể chuẩn bị lại. Vui lòng thử sau.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <main className="performance-page mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl items-center py-6 sm:py-10">
      <section className="relative w-full overflow-hidden rounded-[2rem] border border-[#c4b5fd]/16 bg-[#171d3d]/90 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7 lg:p-10">
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/mock-cv"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary"
            >
              <ArrowLeft size={15} />
              Danh sách CV
            </Link>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                socket?.connected
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-white/10 bg-white/[0.04] text-text-muted"
              }`}
            >
              {socket?.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {socket?.connected ? "Đang cập nhật trực tiếp" : "Đang kết nối"}
            </span>
          </div>

          <div className="mx-auto mt-8 max-w-2xl text-center sm:mt-10">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-accent-light/25 bg-accent/15 text-accent-light shadow-[0_18px_55px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">
              {preparationReady || starting ? (
                <LoaderCircle size={29} className="animate-spin" />
              ) : failure ? (
                <CircleAlert size={29} />
              ) : (
                <FileSearch2 size={29} className="animate-pulse" />
              )}
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-light">
              Mock CV preparation
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-4xl">
              {failure
                ? "Quá trình chuẩn bị cần bạn kiểm tra"
                : starting
                  ? "Đang mở phòng phỏng vấn"
                  : "Đang chuẩn bị bài luyện của bạn"}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary sm:text-white">
              {cv?.analysis?.status === "PENDING"
                ? "CV đang chờ đến lượt xử lý. Bạn có thể đóng trang và quay lại sau."
                : cv
                  ? `${cv.targetRole} · ${cv.analysis?.requestedQuestionCount ?? 10} câu · ${Math.round((cv.analysis?.requestedDurationSeconds ?? 900) / 60)} phút`
                  : "Hệ thống đang đồng bộ thông tin bài luyện."}
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl sm:mt-10">
            <div className="h-2 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-accent shadow-[0_0_24px_rgba(139,92,246,0.55)] transition-[width] duration-700 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-semibold text-text-muted">
              <span>Đã nhận CV</span>
              <span>{progress.percent}%</span>
              <span>Sẵn sàng</span>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-4">
              {PREPARATION_STAGES.map((stage, index) => {
                const complete = index < progress.activeIndex;
                const active = index === progress.activeIndex;
                const Icon = stage.icon;
                return (
                  <div
                    key={stage.title}
                    className={`rounded-xl border p-3 transition-colors ${
                      active
                        ? "border-accent-light/35 bg-accent/12"
                        : complete
                          ? "border-success/15 bg-success/[0.06]"
                          : "border-white/[0.07] bg-white/[0.025]"
                    }`}
                  >
                    <span
                      className={`grid size-8 place-items-center rounded-lg ${
                        complete
                          ? "bg-success/12 text-success"
                          : active
                            ? "bg-accent/18 text-accent-light"
                            : "bg-white/[0.05] text-text-muted"
                      }`}
                    >
                      {complete ? (
                        <Check size={16} />
                      ) : active && !failure ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Icon size={16} />
                      )}
                    </span>
                    <p className="mt-2 text-xs font-bold text-text-primary">
                      {stage.title}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-text-muted">
                      {stage.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {(failure || error) && !loading && (
            <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-danger/20 bg-danger/[0.07] p-4 text-center">
              <p className="text-sm font-semibold text-text-primary">
                {error || failure}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {cv?.analysis?.status !== "UNSUPPORTED" &&
                  cv?.analysis?.status !== "NEEDS_REUPLOAD" && (
                    <button
                      type="button"
                      onClick={() => void handleRetry()}
                      disabled={retrying || starting}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-60"
                    >
                      <RefreshCw
                        size={16}
                        className={retrying ? "animate-spin" : ""}
                      />
                      Thử chuẩn bị lại
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => void loadCv()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-white/[0.08]"
                >
                  <RefreshCw size={16} />
                  Kiểm tra lại
                </button>
              </div>
            </div>
          )}

          {!failure && !error && !loading && (
            <p className="mt-6 text-center text-xs leading-5 text-text-muted">
              Bạn có thể đóng trang này. Hệ thống vẫn tiếp tục chuẩn bị và lưu
              trạng thái để bạn quay lại sau.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function resolveProgress(cv: MockCv | null) {
  const analysis = cv?.analysis;
  if (!analysis) return { percent: 20, activeIndex: 1 };
  if (analysis.status === "PENDING") return { percent: 25, activeIndex: 0 };
  if (analysis.status !== "READY") return { percent: 45, activeIndex: 1 };
  if (analysis.questionGenerationStatus !== "READY") {
    return { percent: 78, activeIndex: 2 };
  }
  return { percent: 100, activeIndex: 3 };
}

function resolveFailure(cv: MockCv | null) {
  const analysis = cv?.analysis;
  if (!analysis) return null;
  if (analysis.isStale) {
    return "Phân tích CV đang lâu hơn dự kiến. Bạn có thể chủ động thử lại.";
  }
  if (analysis.isQuestionGenerationStale) {
    return "Quá trình tạo câu hỏi đang lâu hơn dự kiến. Bạn có thể chủ động thử lại.";
  }
  if (analysis.status === "FAILED") return analysis.failureMessage;
  if (analysis.status === "UNSUPPORTED") {
    return "CV này chưa phù hợp với các nhóm vị trí IT đang được hỗ trợ.";
  }
  if (analysis.status === "NEEDS_REUPLOAD") {
    return "File CV chưa đủ rõ để phân tích. Vui lòng quay lại và tải CV khác.";
  }
  if (analysis.questionGenerationStatus === "FAILED") {
    return analysis.questionGenerationFailureMessage;
  }
  return null;
}
