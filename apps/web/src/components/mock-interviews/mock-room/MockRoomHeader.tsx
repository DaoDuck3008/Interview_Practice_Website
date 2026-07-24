import Image from "next/image";
import { ChevronLeft, ChevronRight, Clock3, FileQuestion } from "lucide-react";
import type { MockInterview } from "@/lib/api/mockInterviews";
import { formatTime } from "@/lib/utils/format";

// Badge topic hiển thị logo/chủ đề ở header câu hỏi và sidebar của /mock-interviews/[id].
export function TopicBadge({ mock }: { mock: MockInterview }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/[0.075] px-2.5 py-1 text-xs font-bold text-white/85 shadow-lg shadow-violet-950/20 backdrop-blur-xl">
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.07]">
        {mock.topic?.iconUrl ? (
          <Image
            src={mock.topic.iconUrl}
            alt={mock.topic.name}
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
        ) : (
          <FileQuestion size={15} className="text-violet-200" />
        )}
      </span>
      <span className="truncate">{mock.topic?.name ?? "Mock interview"}</span>
    </span>
  );
}

// Timer pill dùng chung cho header và giúp cảnh báo nhẹ khi thời gian còn dưới 60 giây.
export function TimerPill({ remaining }: { remaining: number | null }) {
  const isUrgent = remaining !== null && remaining <= 60;

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-black tabular-nums backdrop-blur-xl",
        isUrgent
          ? "border-danger/35 bg-danger/15 text-danger"
          : "border-white/15 bg-white/[0.075] text-white",
      ].join(" ")}
    >
      <Clock3 size={16} className={isUrgent ? "animate-pulse" : ""} />
      {remaining === null ? "--:--" : formatTime(remaining)}
    </span>
  );
}

// Nút chuyển câu trong vùng nội dung chính của phòng mock.
export function QuestionMoveButton({
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
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.055] px-4 text-sm font-bold text-white/70 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/40 hover:bg-white/[0.09] hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-white/15 disabled:hover:bg-white/[0.055] disabled:hover:text-white/70"
    >
      {direction === "previous" && <Icon size={17} />}
      <span className="hidden sm:inline">{label}</span>
      {direction === "next" && <Icon size={17} />}
    </button>
  );
}
