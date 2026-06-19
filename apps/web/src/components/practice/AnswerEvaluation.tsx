import { ChevronRight, Lightbulb, MessageSquareQuote, Sparkles } from "lucide-react";
import type { Score } from "@/lib/api/sessions";

interface Props {
  evaluation: Score;
}

/** Bảng màu theo mức điểm: <5 đỏ, 5–7 vàng, ≥7 xanh lá */
function scorePalette(v: number) {
  if (v >= 7)
    return {
      color: "#22c55e",
      soft: "rgba(34,197,94,0.1)",
      border: "rgba(34,197,94,0.3)",
      glow: "rgba(34,197,94,0.35)",
    };
  if (v >= 5)
    return {
      color: "#f59e0b",
      soft: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.3)",
      glow: "rgba(245,158,11,0.35)",
    };
  return {
    color: "#ef4444",
    soft: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    glow: "rgba(239,68,68,0.35)",
  };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const { color } = scorePalette(value);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#9898aa] w-16 flex-shrink-0">{label}</span>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(10, value)) * 10}%`, background: color }}
        />
      </div>
      <span
        className="font-mono text-xs font-bold w-9 text-right tabular-nums"
        style={{ color }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function AnswerEvaluation({ evaluation }: Props) {
  const avg =
    (evaluation.technicalScore +
      evaluation.completenessScore +
      evaluation.clarityScore) /
    3;
  const avgPalette = scorePalette(avg);

  return (
    <section className="px-6 py-6 flex flex-col gap-5 eval-enter">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
        <Sparkles size={13} className="text-[#8b5cf6]" />
        AI đánh giá
      </p>

      {/* Điểm tổng (trái) + các thanh điểm (phải) */}
      <div className="flex items-center gap-5">
        <div
          className="flex flex-col items-center justify-center flex-shrink-0 rounded-2xl px-5 py-4 w-[104px]"
          style={{
            background: avgPalette.soft,
            border: `1px solid ${avgPalette.border}`,
          }}
        >
          <span
            className="text-4xl font-extrabold leading-none tabular-nums"
            style={{
              color: avgPalette.color,
              textShadow: `0 0 18px ${avgPalette.glow}`,
            }}
          >
            {avg.toFixed(1)}
          </span>
          <span className="mt-1.5 text-[11px] text-[#606072]">/ 10 điểm</span>
        </div>

        <div className="flex-1 flex flex-col gap-3.5 min-w-0">
          <ScoreBar label="Kỹ thuật" value={evaluation.technicalScore} />
          <ScoreBar label="Đầy đủ" value={evaluation.completenessScore} />
          <ScoreBar label="Rõ ràng" value={evaluation.clarityScore} />
        </div>
      </div>

      <blockquote className="border-l-2 border-[#7c3aed] pl-4 flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
          <MessageSquareQuote size={13} className="text-[#606072]" />
          Nhận xét
        </p>
        <p className="text-sm text-[#9898aa] leading-relaxed">
          {evaluation.summary}
        </p>
      </blockquote>

      {evaluation.improvements.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
            <Lightbulb size={13} className="text-[#f59e0b]" />
            Cần cải thiện
          </p>
          <ul className="flex flex-col gap-1.5">
            {evaluation.improvements.map((item, i) => (
              <li
                key={i}
                className="text-sm text-[#9898aa] leading-relaxed flex gap-1.5"
              >
                <ChevronRight
                  size={15}
                  className="text-[#7c3aed] flex-shrink-0 mt-0.5"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
