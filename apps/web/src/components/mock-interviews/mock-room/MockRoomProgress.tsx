import { ArrowLeft, Clock3, ListChecks, Loader2, Send } from "lucide-react";
import type { MockInterviewQuestion } from "@/lib/api/mockInterviews";
import { formatTime } from "@/lib/utils/format";
import { PrimaryPillButton } from "./MockRoomShell";
import { TopicBadge } from "./MockRoomHeader";
import type { MockRoomQuestionListProps } from "./types";
import { mockInterviewTopicLabel } from "@/lib/utils/mockInterview";

// Sidebar desktop của /mock-interviews/[id], giữ timer và điều hướng câu ở trạng thái cố định.
export function ProgressSidebar({
  mock,
  remaining,
  answeredCount,
  activeIndex,
  orderedQuestions,
  submitting,
  onBack,
  onSelect,
  onSubmit,
}: MockRoomQuestionListProps & { onBack: () => void }) {
  return (
    <aside className="fixed bottom-5 right-5 top-20 z-30 hidden w-80 rounded-[1.75rem] border border-white/15 bg-white/[0.06] p-4 shadow-2xl shadow-slate-950/35 backdrop-blur-2xl lg:flex lg:flex-col">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/65 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.09] hover:text-white active:scale-[0.98]"
      >
        <ArrowLeft size={15} />
        Quay lại
      </button>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-inner shadow-white/5">
        <TopicBadge mock={mock} />
        <h2 className="mt-4 line-clamp-3 text-base font-black leading-snug text-white">
          {mock.title}
        </h2>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/65">
              <Clock3 size={16} className="text-violet-200" />
              Thời gian
            </span>
            <span className="animate-pulse font-mono text-2xl font-black tabular-nums text-white">
              {remaining === null ? "--:--" : formatTime(remaining)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-white/62">
            <ListChecks size={16} className="text-violet-200/75" />
            Hoàn thiện
          </span>
          <span className="font-mono font-black tabular-nums text-white">
            {answeredCount}/{mock.totalQuestions}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 overflow-y-auto pr-1">
        {orderedQuestions.map((item, index) => (
          <QuestionNavItem
            key={item.id}
            item={item}
            active={index === activeIndex}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>

      <PrimaryPillButton
        onClick={onSubmit}
        disabled={submitting}
        className="mt-5 w-full bg-violet-100 px-4 text-sm shadow-violet-950/20 hover:bg-white"
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
        Nộp bài
      </PrimaryPillButton>
    </aside>
  );
}

// Dock mobile gom timer, tiến độ, nộp bài và danh sách câu cho thao tác bằng ngón cái.
export function MobileBottomDock({
  mock,
  remaining,
  answeredCount,
  activeIndex,
  orderedQuestions,
  submitting,
  onSelect,
  onSubmit,
}: MockRoomQuestionListProps) {
  return (
    <aside className="fixed inset-x-3 bottom-3 z-40 rounded-[1.5rem] border border-white/15 bg-slate-950/55 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl lg:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white/45">
            {mockInterviewTopicLabel(mock)}
          </p>
          <p className="mt-0.5 animate-pulse font-mono text-xl font-black tabular-nums text-white">
            {remaining === null ? "--:--" : formatTime(remaining)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/45">Hoàn thiện</p>
          <p className="font-mono text-sm font-black tabular-nums text-white">
            {answeredCount}/{mock.totalQuestions}
          </p>
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-violet-100 px-4 text-sm font-black text-slate-950 shadow-xl shadow-violet-950/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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

// Ô điều hướng từng câu, đổi màu để phân biệt câu hiện tại và câu đã trả lời.
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
        "flex aspect-square shrink-0 items-center justify-center rounded-full border text-xs font-black tabular-nums backdrop-blur-xl transition-all duration-300 active:scale-95",
        compact ? "h-9 w-9" : "min-h-10",
        answered
          ? "border-success/35 bg-success/15 text-success shadow-lg shadow-success/10"
          : active
            ? "border-violet-200/55 bg-violet-400/20 text-white shadow-lg shadow-violet-500/20"
            : "border-white/10 bg-white/[0.045] text-white/60 hover:border-violet-300/35 hover:bg-white/[0.08] hover:text-white",
      ].join(" ")}
    >
      {item.order}
    </button>
  );
}
