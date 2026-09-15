"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Flag,
  CheckCircle2,
  Pencil,
  Save,
  Sparkles,
  MessageSquareQuote,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import Modal from "./Modal";
import {
  getSessionAdminDetail,
  reviewSessionFlag,
  manualRescoreSession,
  type AdminSessionDetail,
} from "@/lib/api/sessions";
import { formatDate, formatDuration } from "@/lib/utils/format";

interface Props {
  sessionId: string | null;
  onClose: () => void;
  /** Gọi lại sau khi review/chấm lại thành công, để trang danh sách refetch. */
  onUpdated: () => void;
}

/** <5 đỏ, 5-7 vàng, >=7 xanh lá — nhất quán với bảng danh sách. */
function scoreColor(v: number): string {
  if (v >= 7) return "#22c55e";
  if (v >= 5) return "#f59e0b";
  return "#ef4444";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--color-text-muted)] w-16 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(10, value)) * 10}%`, background: color }}
        />
      </div>
      <span
        className="font-mono text-xs font-bold w-6 text-right tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

export default function SessionDetailModal({
  sessionId,
  onClose,
  onUpdated,
}: Props) {
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Xử lý báo cáo
  const [note, setNote] = useState("");
  const [resolved, setResolved] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  // Chấm lại thủ công
  const [editingScore, setEditingScore] = useState(false);
  const [technicalScore, setTechnicalScore] = useState(0);
  const [completenessScore, setCompletenessScore] = useState(0);
  const [clarityScore, setClarityScore] = useState(0);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [improvementsDraft, setImprovementsDraft] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    queueMicrotask(() => {
    setDetail(null);
    setEditingScore(false);
    setLoading(true);
    getSessionAdminDetail(sessionId)
      .then((d) => {
        setDetail(d);
        setNote(d.score?.adminNote ?? "");
        setResolved(!!d.score?.flagResolvedAt);
        setTechnicalScore(d.score?.technicalScore ?? 0);
        setCompletenessScore(d.score?.completenessScore ?? 0);
        setClarityScore(d.score?.clarityScore ?? 0);
        setSummaryDraft(d.score?.summary ?? "");
        setImprovementsDraft((d.score?.improvements ?? []).join("\n"));
      })
      .catch(() => toast.error("Không tải được chi tiết session."))
      .finally(() => setLoading(false));
    });
  }, [sessionId]);

  async function saveReview() {
    if (!sessionId) return;
    setSavingReview(true);
    try {
      await reviewSessionFlag(sessionId, { note: note.trim(), resolved });
      toast.success("Đã lưu xử lý báo cáo.");
      onUpdated();
      const d = await getSessionAdminDetail(sessionId);
      setDetail(d);
    } catch {
      toast.error("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSavingReview(false);
    }
  }

  async function saveManualScore() {
    if (!sessionId) return;
    const improvements = improvementsDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!summaryDraft.trim()) {
      toast.error("Nhận xét không được để trống.");
      return;
    }
    setSavingScore(true);
    try {
      await manualRescoreSession(sessionId, {
        technicalScore,
        completenessScore,
        clarityScore,
        summary: summaryDraft.trim(),
        improvements,
      });
      toast.success("Đã cập nhật điểm.");
      setEditingScore(false);
      onUpdated();
      const d = await getSessionAdminDetail(sessionId);
      setDetail(d);
    } catch {
      toast.error("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSavingScore(false);
    }
  }

  return (
    <Modal
      open={sessionId !== null}
      onClose={onClose}
      title="Chi tiết session"
    >
      {loading || !detail ? (
        <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Header */}
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {detail.user.name}{" "}
              <span className="font-normal text-[var(--color-text-muted)]">
                ({detail.user.email})
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {detail.question?.content ?? "Câu hỏi không còn khả dụng"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {detail.question?.topic.name ?? "Không có chủ đề"} · {formatDuration(detail.duration)}{" "}
              · {formatDate(detail.createdAt)}
            </p>
          </div>

          {/* Audio */}
          <div className="flex flex-col gap-1.5">
            <audio controls src={detail.audioUrl} className="w-full h-10" />
            <a
              href={detail.audioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
            >
              <ExternalLink size={12} />
              Mở file gốc
            </a>
          </div>

          {/* Transcript */}
          <blockquote className="border-l-2 border-[var(--color-accent)] pl-4">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">
              Transcript
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
              {detail.transcript || "(rỗng)"}
            </p>
          </blockquote>

          {detail.score && (
            <>
              {/* Điểm AI */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
                    <Sparkles size={13} className="text-[var(--color-accent-light)]" />
                    Điểm AI hiện tại
                  </p>
                  {detail.score.manuallyEditedAt && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      Đã sửa tay lúc {formatDate(detail.score.manuallyEditedAt)}
                      {detail.score.reviewedBy && ` bởi ${detail.score.reviewedBy.name}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <ScoreBar label="Kỹ thuật" value={detail.score.technicalScore} />
                  <ScoreBar label="Đầy đủ" value={detail.score.completenessScore} />
                  <ScoreBar label="Rõ ràng" value={detail.score.clarityScore} />
                </div>

                {!editingScore ? (
                  <>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {detail.score.summary}
                    </p>
                    {detail.score.improvements.length > 0 && (
                      <ul className="flex flex-col gap-1 pl-4 list-disc text-sm text-[var(--color-text-secondary)]">
                        {detail.score.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {detail.score.matchedKeywords.map((k) => (
                        <span
                          key={k}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30"
                        >
                          {k}
                        </span>
                      ))}
                      {detail.score.missedKeywords.map((k) => (
                        <span
                          key={k}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)] border border-[var(--color-border)]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditingScore(true)}
                      className="flex items-center gap-1.5 self-start text-xs text-[var(--color-accent-light)] hover:underline cursor-pointer"
                    >
                      <Pencil size={12} />
                      Chấm lại thủ công
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] p-4">
                    <div className="grid grid-cols-3 gap-3">
                      <NumberField
                        label="Kỹ thuật"
                        value={technicalScore}
                        onChange={setTechnicalScore}
                      />
                      <NumberField
                        label="Đầy đủ"
                        value={completenessScore}
                        onChange={setCompletenessScore}
                      />
                      <NumberField
                        label="Rõ ràng"
                        value={clarityScore}
                        onChange={setClarityScore}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                        Nhận xét
                      </label>
                      <textarea
                        value={summaryDraft}
                        onChange={(e) => setSummaryDraft(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                        Gợi ý cải thiện (mỗi dòng 1 gợi ý)
                      </label>
                      <textarea
                        value={improvementsDraft}
                        onChange={(e) => setImprovementsDraft(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditingScore(false)}
                        className="rounded-md border border-white/10 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={saveManualScore}
                        disabled={savingScore}
                        className="flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-light)] disabled:opacity-60 cursor-pointer"
                      >
                        {savingScore ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Lưu điểm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Báo cáo từ người dùng */}
              {detail.score.flaggedAt && (
                <div className="flex flex-col gap-3 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.04] p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
                    <Flag size={13} />
                    Báo cáo từ người dùng · {formatDate(detail.score.flaggedAt)}
                  </p>
                  {detail.score.flagReason && (
                    <p className="text-sm text-[var(--color-text-secondary)] italic">
                      “{detail.score.flagReason}”
                    </p>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                      Ghi chú nội bộ
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Ghi lại kết luận sau khi xem xét…"
                      className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resolved}
                      onChange={(e) => setResolved(e.target.checked)}
                      className="cursor-pointer"
                    />
                    Đã xử lý xong
                  </label>
                  <button
                    onClick={saveReview}
                    disabled={savingReview}
                    className="flex items-center justify-center gap-2 self-end rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-light)] disabled:opacity-60 cursor-pointer"
                  >
                    {savingReview ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Lưu xử lý
                  </button>
                </div>
              )}
            </>
          )}

          {detail.improvement && (
            <div className="flex flex-col gap-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
                <MessageSquareQuote size={13} />
                Bản viết lại (Improvement)
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                {detail.improvement.improvedAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--color-text-secondary)]">
        {label}
      </label>
      <input
        type="number"
        min={0}
        max={10}
        value={value}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(10, Number(e.target.value))))
        }
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
      />
    </div>
  );
}
