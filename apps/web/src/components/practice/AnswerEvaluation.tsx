import type { Score } from "@/lib/api/sessions";
import CircularScore from "@/components/ui/CircularScore";

interface Props {
  evaluation: Score;
}

export default function AnswerEvaluation({ evaluation }: Props) {
  return (
    <section
      className="px-6 py-6 flex flex-col gap-5"
      style={{ borderTopColor: "rgba(124,58,237,0.3)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#606072] font-mono">$ ai evaluation</p>
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-extrabold text-[#8b5cf6]"
            style={{ textShadow: "0 0 16px rgba(139,92,246,0.4)" }}
          >
            {(
              (evaluation.technicalScore +
                evaluation.completenessScore +
                evaluation.clarityScore) /
              3
            ).toFixed(1)}
          </span>
          <span className="text-sm text-[#606072]">/10</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <CircularScore
          score={evaluation.technicalScore}
          label="Kỹ thuật"
          color="#7c3aed"
        />
        <CircularScore
          score={evaluation.completenessScore}
          label="Đầy đủ"
          color="#8b5cf6"
        />
        <CircularScore
          score={evaluation.clarityScore}
          label="Rõ ràng"
          color="#a78bfa"
        />
      </div>

      <blockquote className="border-l-2 border-[#7c3aed] pl-4 flex flex-col gap-1.5">
        <p className="text-xs text-[#606072] font-mono">nhận xét</p>
        <p className="text-sm text-[#9898aa] leading-relaxed">
          {evaluation.summary}
        </p>
      </blockquote>

      {evaluation.improvements.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[#606072] font-mono">$ cần cải thiện</p>
          <ul className="flex flex-col gap-1.5">
            {evaluation.improvements.map((item, i) => (
              <li
                key={i}
                className="text-sm text-[#9898aa] leading-relaxed flex gap-2"
              >
                <span className="text-[#7c3aed] flex-shrink-0">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
