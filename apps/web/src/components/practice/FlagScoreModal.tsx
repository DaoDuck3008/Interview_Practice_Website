"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import ModalPortal from "@/components/ui/ModalPortal";
import { flagScore } from "@/lib/api/sessions";

interface Props {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onFlagged: () => void;
}

export default function FlagScoreModal({
  open,
  sessionId,
  onClose,
  onFlagged,
}: Props) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await flagScore(sessionId, reason.trim() || undefined);
      toast.success("Đã ghi nhận, cảm ơn phản hồi của bạn.");
      onFlagged();
      onClose();
    } catch {
      toast.error("Gửi báo cáo thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
        onMouseDown={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--color-elevated)] overflow-hidden"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="flex items-center gap-2 text-white font-semibold text-[var(--color-text-primary)]">
              <Flag size={16} className="text-[#f59e0b]" />
              Báo điểm chấm sai
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Bạn thấy điểm hoặc nhận xét ở trên chưa đúng? Cho mình biết lý do
              (không bắt buộc) — đội ngũ sẽ xem lại để cải thiện.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Lý do (tuỳ chọn)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Vd: Mình trả lời đúng và đủ ý nhưng bị chấm lan man..."
                className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
              />
            </div>

            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-white/10 px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Gửi báo cáo
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
