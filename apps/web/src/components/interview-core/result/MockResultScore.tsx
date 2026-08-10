import { useEffect, useState } from "react";
import type { Score } from "@/lib/api/sessions";
import {
  mockInterviewScoreBand,
  mockInterviewScoreText,
} from "@/lib/utils/mockInterview";

// Số điểm tổng có animation đếm lên để trang result có cảm giác phản hồi sau khi chấm xong.
export function AnimatedScoreNumber({ value }: { value: number | null }) {
  const [displayValue, setDisplayValue] = useState<number | null>(
    value === null ? null : 0,
  );

  useEffect(() => {
    let frame = 0;

    if (value === null) {
      frame = requestAnimationFrame(() => setDisplayValue(null));
      return () => cancelAnimationFrame(frame);
    }

    const target = Math.max(0, Math.min(10, value));
    const duration = 850;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{mockInterviewScoreText(displayValue)}</>;
}

// Thanh điểm dùng chung cho điểm tổng hợp và từng câu trong trang kết quả mock.
export function ScoreBar({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | null;
  compact?: boolean;
}) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const normalized = value === null ? 0 : Math.max(0, Math.min(10, value));
  const scoreBand = mockInterviewScoreBand(value);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setAnimatedWidth(normalized * 10),
    );
    return () => cancelAnimationFrame(frame);
  }, [normalized]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className={compact ? "text-xs text-white/62" : "text-sm text-white/62"}>
          {label}
        </span>
        <span
          className={`font-mono text-sm font-bold tabular-nums ${scoreBand.textClassName}`}
        >
          {mockInterviewScoreText(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBand.progressClassName}`}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
    </div>
  );
}

export function averageScore(score: Score) {
  return (
    (score.technicalScore + score.completenessScore + score.clarityScore) / 3
  );
}
