import { ArrowLeft, Clock3, Loader2, Send } from "lucide-react";
import type { InterviewSessionView } from "@/lib/interview-core/types";
import StatusModal from "@/components/ui/StatusModal";
import { PrimaryPillButton, SecondaryPillButton } from "./MockRoomShell";

// Panel hết giờ của /mock-interviews/[id], khóa recorder và hướng người dùng nộp bài.
export function ExpiredMockPanel({
  mock,
  answeredCount,
  unansweredCount,
  submitting,
  onBack,
  onSubmit,
}: {
  mock: InterviewSessionView;
  answeredCount: number;
  unansweredCount: number;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-2xl flex-col justify-center py-6">
      <div className="rounded-[1.75rem] border border-danger/30 bg-white/[0.06] p-6 text-center shadow-2xl shadow-danger/10 backdrop-blur-2xl md:p-7">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
          <Clock3 size={26} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-danger">
          Đã hết thời gian
        </p>
        <h1 className="mt-3 text-2xl font-black text-white md:text-3xl">
          Không thể tiếp tục làm bài
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/62">
          {`Buổi mock "${mock.title}" đã hết giờ. Bạn cần nộp bài để hệ thống chấm các câu đã trả lời.`}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3 text-sm backdrop-blur-xl">
          <StatTile label="Đã trả lời" value={answeredCount} tone="success" />
          <StatTile label="Bỏ qua" value={unansweredCount} tone="neutral" />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <SecondaryPillButton onClick={onBack}>
            <ArrowLeft size={15} />
            Quay lại
          </SecondaryPillButton>
          <PrimaryPillButton onClick={onSubmit} disabled={submitting} className="flex-1">
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            Nộp bài
          </PrimaryPillButton>
        </div>
      </div>
    </section>
  );
}

// Modal xác nhận nộp bài, dùng để nhắc số câu chưa trả lời trước khi khóa buổi mock.
export function SubmitConfirmModal({
  open,
  mock,
  answeredCount,
  unansweredCount,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mock: InterviewSessionView;
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

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <p className="text-xs text-white/45">{label}</p>
      <p
        className={[
          "mt-1 font-mono text-xl font-black tabular-nums",
          tone === "success" ? "text-success" : "text-white",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
