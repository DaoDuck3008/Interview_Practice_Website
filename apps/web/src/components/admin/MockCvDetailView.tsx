"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  CircleCheck,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getMockCvAdminDetail,
  hardDeleteMockCvAdmin,
  hardDeleteMockCvInterviewAdmin,
  retryMockCvAnalysisAdmin,
  retryMockCvInterviewScoringAdmin,
  retryMockCvQuestionsAdmin,
  type AdminMockCvDetail,
  type AdminMockCvInterview,
} from "@/lib/api/mockCvs";
import { formatDate, formatDuration, formatFileSize } from "@/lib/utils/format";
import {
  analysisStatusClass,
  interviewStatusClass,
  MOCK_CV_ANALYSIS_STATUS_LABEL,
  MOCK_CV_QUESTION_STATUS_LABEL,
  MOCK_INTERVIEW_STATUS_LABEL,
  questionStatusClass,
} from "@/lib/utils/mockAdmin";
import { toastApiError } from "@/lib/utils/apiError";
import { useStatusModal } from "@/components/ui/useStatusModal";

interface Props {
  mockCvId: string;
}

type RunningAction =
  | "analysis"
  | "questions"
  | "delete-cv"
  | `score-${string}`
  | `delete-${string}`
  | null;

const FOCUS_LABEL: Record<string, string> = {
  PROJECT: "Dự án",
  EXPERIENCE: "Kinh nghiệm",
  TECHNICAL_DEPTH: "Chuyên môn",
  CLAIM_VERIFICATION: "Xác minh CV",
};

function canRetryAnalysis(detail: AdminMockCvDetail): boolean {
  const analysis = detail.analysis;
  if (!analysis) return false;
  return (
    analysis.status === "FAILED" || analysis.status === "ANALYZING"
  );
}

function canRetryQuestions(detail: AdminMockCvDetail): boolean {
  const analysis = detail.analysis;
  if (!analysis || analysis.status !== "READY") return false;
  return (
    analysis.questionGenerationStatus !== "READY"
  );
}

function canRetryScoring(interview: AdminMockCvInterview): boolean {
  const hasFailed = interview.questions.some(
    (question) => question.scoreStatus === "FAILED",
  );
  const hasQueued =
    (interview.status === "SUBMITTED" || interview.status === "SCORING") &&
    interview.questions.some((question) => question.scoreStatus === "QUEUED");
  return hasFailed || hasQueued;
}

function canDeleteInterview(interview: AdminMockCvInterview): boolean {
  return interview.status !== "IN_PROGRESS";
}

export default function MockCvDetailView({ mockCvId }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminMockCvDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<RunningAction>(null);
  const { confirm, statusModal } = useStatusModal();

  async function load(id: string) {
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await getMockCvAdminDetail(id));
    } catch (error) {
      setLoadError("Không tìm thấy Mock CV hoặc dữ liệu không còn tồn tại.");
      toastApiError(error, "Không tải được chi tiết Mock CV.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      setDetail(null);
      void load(mockCvId);
    });
  }, [mockCvId]);

  async function retryAnalysis() {
    if (!detail) return;
    setRunningAction("analysis");
    try {
      setDetail(await retryMockCvAnalysisAdmin(detail.id));
      toast.success("Đã đưa CV vào hàng đợi phân tích lại.");
    } catch (error) {
      toastApiError(error, "Chưa thể phân tích lại CV này.");
    } finally {
      setRunningAction(null);
    }
  }

  async function retryQuestions() {
    if (!detail) return;
    setRunningAction("questions");
    try {
      setDetail(await retryMockCvQuestionsAdmin(detail.id));
      toast.success("Đã đưa bộ câu hỏi vào hàng đợi tạo lại.");
    } catch (error) {
      toastApiError(error, "Chưa thể tạo lại bộ câu hỏi.");
    } finally {
      setRunningAction(null);
    }
  }

  async function retryScoring(interviewId: string) {
    setRunningAction(`score-${interviewId}`);
    try {
      setDetail(await retryMockCvInterviewScoringAdmin(interviewId));
      toast.success("Đã đưa các câu lỗi vào hàng đợi chấm lại.");
    } catch (error) {
      toastApiError(error, "Chưa thể chấm lại bài phỏng vấn này.");
    } finally {
      setRunningAction(null);
    }
  }

  async function deleteInterview(interview: AdminMockCvInterview) {
    if (!detail) return;
    const accepted = await confirm({
      type: "error",
      title: "Xóa vĩnh viễn lần phỏng vấn?",
      message:
        "Toàn bộ câu trả lời, transcript, audio và điểm của lần phỏng vấn này sẽ bị xóa. CV gốc vẫn được giữ lại.",
      confirmText: "Xóa vĩnh viễn",
    });
    if (!accepted) return;

    setRunningAction(`delete-${interview.id}`);
    try {
      await hardDeleteMockCvInterviewAdmin(interview.id);
      setDetail(await getMockCvAdminDetail(detail.id));
      toast.success("Đã xóa vĩnh viễn lần phỏng vấn.");
    } catch (error) {
      toastApiError(error, "Không thể xóa lần phỏng vấn này.");
    } finally {
      setRunningAction(null);
    }
  }

  async function deleteCv() {
    if (!detail) return;
    const accepted = await confirm({
      type: "error",
      title: "Xóa vĩnh viễn Mock CV?",
      message:
        "File PDF, kết quả phân tích, bộ câu hỏi và toàn bộ lịch sử phỏng vấn của CV này sẽ bị xóa và không thể khôi phục.",
      confirmText: "Xóa toàn bộ",
    });
    if (!accepted) return;

    setRunningAction("delete-cv");
    try {
      await hardDeleteMockCvAdmin(detail.id);
      toast.success("Đã xóa vĩnh viễn Mock CV.");
      router.replace("/admin/mock-cv");
    } catch (error) {
      toastApiError(error, "Không thể xóa Mock CV này.");
    } finally {
      setRunningAction(null);
    }
  }

  const busy = runningAction !== null;

  return (
    <>
      <div className="flex flex-col gap-6">
        <Link
          href="/admin/mock-cv"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách Mock CV
        </Link>
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-surface text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : loadError || !detail ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 text-center">
            <AlertTriangle size={24} className="text-danger" />
            <h1 className="mt-4 text-lg font-semibold text-text-primary">
              Không thể mở Mock CV
            </h1>
            <p className="mt-2 text-sm text-text-muted">{loadError}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-surface p-5 lg:p-6">
              <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <UserRound size={16} className="text-accent-light" />
                    <span className="truncate">{detail.user.name}</span>
                    <span className="truncate font-normal text-text-muted">
                      {detail.user.email}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-text-primary">
                    {detail.targetRole}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText size={13} />
                      {detail.fileName} · {formatFileSize(detail.fileSize)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock size={13} />
                      Tạo {formatDate(detail.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canRetryAnalysis(detail) && (
                    <ActionButton
                      label="Phân tích lại"
                      icon={RefreshCw}
                      loading={runningAction === "analysis"}
                      disabled={busy}
                      onClick={retryAnalysis}
                    />
                  )}
                  {canRetryQuestions(detail) && (
                    <ActionButton
                      label="Tạo lại câu hỏi"
                      icon={Sparkles}
                      loading={runningAction === "questions"}
                      disabled={busy}
                      onClick={retryQuestions}
                    />
                  )}
                  <button
                    onClick={deleteCv}
                    disabled={busy}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {runningAction === "delete-cv" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    Xóa vĩnh viễn
                  </button>
                </div>
              </header>
            </div>

            <AnalysisPanel detail={detail} />

            <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      Bộ câu hỏi đã chuẩn bị
                    </h4>
                    <p className="mt-1 text-xs text-text-muted">
                      {detail.questions.length} câu hỏi được lưu theo CV này.
                    </p>
                  </div>
                </div>
                {detail.questions.length === 0 ? (
                  <EmptyPanel message="Chưa có câu hỏi nào được tạo." />
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {detail.questions.map((question) => (
                      <div
                        key={question.id}
                        className="rounded-lg border border-border bg-elevated p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-xs font-semibold text-text-secondary">
                            {question.order}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm leading-relaxed text-text-primary">
                              {question.content}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-text-muted">
                              <span className="rounded-full border border-border px-2 py-0.5">
                                {question.source === "QUESTION_BANK"
                                  ? "Ngân hàng"
                                  : "AI tạo"}
                              </span>
                              {question.focusArea && (
                                <span className="rounded-full border border-border px-2 py-0.5">
                                  {FOCUS_LABEL[question.focusArea] ??
                                    question.focusArea}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </section>

            <section>
                <h4 className="text-sm font-semibold text-text-primary">
                  Lịch sử phỏng vấn
                </h4>
                <p className="mt-1 text-xs text-text-muted">
                  {detail.interviews.length} lần phỏng vấn gắn với CV.
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {detail.interviews.length === 0 ? (
                    <EmptyPanel message="Người dùng chưa bắt đầu phỏng vấn với CV này." />
                  ) : (
                    detail.interviews.map((interview) => (
                      <InterviewPanel
                        key={interview.id}
                        interview={interview}
                        busy={busy}
                        runningAction={runningAction}
                        onRetry={() => retryScoring(interview.id)}
                        onDelete={() => deleteInterview(interview)}
                      />
                    ))
                  )}
                </div>
            </section>
          </div>
        )}
      </div>
      {statusModal}
    </>
  );
}

function AnalysisPanel({ detail }: { detail: AdminMockCvDetail }) {
  const analysis = detail.analysis;
  if (!analysis) return <EmptyPanel message="CV chưa có bản ghi phân tích." />;

  return (
    <section className="rounded-lg border border-border bg-elevated p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${analysisStatusClass(analysis.status)}`}
        >
          {MOCK_CV_ANALYSIS_STATUS_LABEL[analysis.status]}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${questionStatusClass(analysis.questionGenerationStatus)}`}
        >
          {MOCK_CV_QUESTION_STATUS_LABEL[analysis.questionGenerationStatus]}
        </span>
        {analysis.extractionQuality && (
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary">
            Chất lượng trích xuất: {analysis.extractionQuality}
          </span>
        )}
      </div>

      {(analysis.analysisError || analysis.questionGenerationError) && (
        <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {analysis.analysisError || analysis.questionGenerationError}
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        {analysis.summary || "Chưa có tóm tắt phân tích CV."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="Lần phân tích" value={String(analysis.analysisAttempt)} />
        <Metric
          label="Câu yêu cầu"
          value={String(analysis.requestedQuestionCount ?? "—")}
        />
        <Metric
          label="Từ ngân hàng"
          value={String(analysis.selectedBankQuestionCount ?? "—")}
        />
        <Metric
          label="AI tạo"
          value={String(analysis.generatedQuestionCount ?? "—")}
        />
      </div>

      {analysis.technicalSkills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.technicalSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs text-accent-light"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function InterviewPanel({
  interview,
  busy,
  runningAction,
  onRetry,
  onDelete,
}: {
  interview: AdminMockCvInterview;
  busy: boolean;
  runningAction: RunningAction;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const answered = interview.questions.filter(
    (question) => question.answerStatus === "ANSWERED",
  ).length;
  const failed = interview.questions.filter(
    (question) => question.scoreStatus === "FAILED",
  ).length;

  return (
    <details className="group rounded-lg border border-border bg-surface">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ChevronDown
            size={16}
            className="shrink-0 text-text-muted transition-transform group-open:rotate-180"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {interview.title}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {answered}/{interview.totalQuestions} câu ·{" "}
              {formatDuration(interview.durationSeconds)} ·{" "}
              {formatDate(interview.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-7 sm:pl-0">
          {failed > 0 && (
            <span className="text-xs font-medium text-danger">{failed} lỗi</span>
          )}
          {interview.overallScore !== null && (
            <span className="text-sm font-bold tabular-nums text-text-primary">
              {interview.overallScore.toFixed(1)}
            </span>
          )}
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${interviewStatusClass(interview.status)}`}
          >
            {MOCK_INTERVIEW_STATUS_LABEL[interview.status]}
          </span>
        </div>
      </summary>

      <div className="border-t border-border p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {canRetryScoring(interview) && (
            <ActionButton
              label="Chấm lại AI"
              icon={RefreshCw}
              loading={runningAction === `score-${interview.id}`}
              disabled={busy}
              onClick={onRetry}
            />
          )}
          {canDeleteInterview(interview) && (
            <button
              onClick={onDelete}
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-danger/30 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runningAction === `delete-${interview.id}` ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Xóa lần phỏng vấn
            </button>
          )}
        </div>

        {interview.overviewError && (
          <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {interview.overviewError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {interview.questions.map((question) => (
            <details
              key={question.id}
              className="rounded-md border border-border bg-elevated"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 text-sm text-text-primary">
                {question.scoreStatus === "FAILED" ? (
                  <AlertTriangle size={15} className="shrink-0 text-danger" />
                ) : question.scoreStatus === "SCORED" ? (
                  <CircleCheck size={15} className="shrink-0 text-success" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-text-muted" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  Câu {question.order}: {question.content}
                </span>
                <ChevronDown size={14} className="shrink-0 text-text-muted" />
              </summary>
              <div className="border-t border-border p-3">
                {question.scoreError && (
                  <p className="mb-3 text-sm text-danger">{question.scoreError}</p>
                )}
                {question.session ? (
                  <div className="flex flex-col gap-3">
                    <audio
                      controls
                      src={question.session.audioUrl}
                      className="h-10 w-full"
                    />
                    <div className="border-l-2 border-accent pl-3">
                      <p className="mb-1 text-xs font-medium text-text-muted">
                        Transcript
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                        {question.session.transcript || "(rỗng)"}
                      </p>
                    </div>
                    {question.session.score && (
                      <p className="text-xs text-text-muted">
                        Kỹ thuật {question.session.score.technicalScore} · Đầy đủ{" "}
                        {question.session.score.completenessScore} · Rõ ràng{" "}
                        {question.session.score.clarityScore}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    Người dùng chưa trả lời câu này.
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </details>
  );
}

function ActionButton({
  label,
  icon: Icon,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof RefreshCw;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Icon size={15} />
      )}
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-elevated px-4 py-6 text-center text-sm text-text-muted">
      {message}
    </div>
  );
}
