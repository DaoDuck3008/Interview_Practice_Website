"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import Modal from "./Modal";
import {
  getMockInterviewAdminDetail,
  retryMockInterviewScoringAdmin,
  type AdminMockInterviewDetail,
  type MockInterviewStatus,
} from "@/lib/api/mockInterviews";
import { formatDate, formatDuration } from "@/lib/utils/format";

interface Props {
  mockInterviewId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

const statusLabel: Record<MockInterviewStatus, string> = {
  DRAFT: "Bản nháp",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  SCORING: "Đang chấm",
  SCORED: "Đã chấm",
  ABANDONED: "Đã bỏ dở",
};

function canRetry(detail: AdminMockInterviewDetail) {
  const hasFailed = detail.questions.some(
    (question) => question.scoreStatus === "FAILED",
  );
  const isStale =
    detail.status === "SCORING" &&
    Date.now() - new Date(detail.updatedAt).getTime() >= 2 * 60 * 1000;
  return (
    hasFailed ||
    (isStale &&
      detail.questions.some((question) => question.scoreStatus === "QUEUED"))
  );
}

export default function MockInterviewDetailModal({
  mockInterviewId,
  onClose,
  onUpdated,
}: Props) {
  const [detail, setDetail] = useState<AdminMockInterviewDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function load(id: string) {
    setLoading(true);
    try {
      setDetail(await getMockInterviewAdminDetail(id));
    } catch {
      toast.error("Không tải được chi tiết mock interview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mockInterviewId) return;
    queueMicrotask(() => {
      setDetail(null);
      void load(mockInterviewId);
    });
  }, [mockInterviewId]);

  async function retryScoring() {
    if (!mockInterviewId) return;
    setRetrying(true);
    try {
      setDetail(await retryMockInterviewScoringAdmin(mockInterviewId));
      toast.success("Đã đưa các câu lỗi vào hàng đợi chấm lại.");
      onUpdated();
    } catch {
      toast.error(
        "Chưa thể chấm lại bài này. Bài có thể chưa đủ điều kiện hoặc đang trong cooldown.",
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Modal
      open={mockInterviewId !== null}
      onClose={onClose}
      title="Chi tiết mock interview"
    >
      {loading || !detail ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {detail.user.name}{" "}
                <span className="font-normal text-text-muted">
                  ({detail.user.email})
                </span>
              </p>
              <p className="mt-1 text-sm text-text-secondary">{detail.title}</p>
              <p className="mt-1 text-xs text-text-muted">
                {detail.topics.map((topic) => topic.name).join(" · ")} ·{" "}
                {formatDuration(detail.durationSeconds)} ·{" "}
                {formatDate(detail.createdAt)}
              </p>
            </div>
            <span className="rounded-full border border-border bg-elevated px-2.5 py-1 text-xs text-text-secondary">
              {statusLabel[detail.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-elevated p-3 text-sm sm:grid-cols-4">
            <Metric
              label="Điểm tổng"
              value={detail.overallScore?.toFixed(1) ?? "—"}
            />
            <Metric
              label="Đã trả lời"
              value={`${detail.questions.filter((q) => q.answerStatus === "ANSWERED").length}/${detail.totalQuestions}`}
            />
            <Metric
              label="Đã chấm"
              value={String(
                detail.questions.filter((q) => q.scoreStatus === "SCORED")
                  .length,
              )}
            />
            <Metric
              label="Câu lỗi"
              value={String(
                detail.questions.filter((q) => q.scoreStatus === "FAILED")
                  .length,
              )}
              danger
            />
          </div>

          {canRetry(detail) && (
            <button
              onClick={retryScoring}
              disabled={retrying}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              Chấm lại AI
            </button>
          )}

          <div className="flex flex-col gap-2">
            {detail.questions.map((item) => (
              <details
                key={item.id}
                className="group rounded-lg border border-border bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 text-sm text-text-primary">
                  <ChevronDown
                    size={16}
                    className="shrink-0 text-text-muted transition-transform group-open:rotate-180"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    Câu {item.order}: {item.question.content}
                  </span>
                  <StatusIcon
                    failed={item.scoreStatus === "FAILED"}
                    scored={item.scoreStatus === "SCORED"}
                  />
                </summary>
                <div className="flex flex-col gap-4 border-t border-border p-4">
                  <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                    <span>Trả lời: {item.answerStatus}</span>
                    <span>Chấm: {item.scoreStatus}</span>
                    {item.session && (
                      <span>
                        Audio: {formatDuration(item.session.duration)}
                      </span>
                    )}
                  </div>
                  {item.scoreError && (
                    <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {item.scoreError}
                    </p>
                  )}
                  {item.session ? (
                    <>
                      <audio
                        controls
                        src={item.session.audioUrl}
                        className="h-10 w-full"
                      />
                      <blockquote className="border-l-2 border-accent pl-3">
                        <p className="mb-1 text-xs font-medium text-text-muted">
                          Transcript
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                          {item.session.transcript || "(rỗng)"}
                        </p>
                      </blockquote>
                      {item.session.score && (
                        <p className="text-sm text-text-secondary">
                          Điểm: Kỹ thuật {item.session.score.technicalScore} ·
                          Đầy đủ {item.session.score.completenessScore} · Rõ
                          ràng {item.session.score.clarityScore}
                        </p>
                      )}
                    </>
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
      )}
    </Modal>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums ${danger && value !== "0" ? "text-danger" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusIcon({ failed, scored }: { failed: boolean; scored: boolean }) {
  if (failed)
    return <AlertTriangle size={16} className="shrink-0 text-danger" />;
  if (scored)
    return <CircleCheck size={16} className="shrink-0 text-success" />;
  return <span className="h-2 w-2 shrink-0 rounded-full bg-text-muted" />;
}
