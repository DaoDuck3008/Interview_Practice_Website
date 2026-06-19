import {
  ChevronRight,
  FileText,
  ListChecks,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { Improvement } from "@/lib/api/sessions";

interface Props {
  transcript: string;
  improvement: Improvement;
}

interface Segment {
  text: string;
  issue?: string;
  suggestion?: string;
}

/** Tìm vị trí từng annotation trong transcript gốc, bỏ qua phần bị trùng/overlap. */
function buildHighlightedSegments(
  transcript: string,
  annotations: Improvement["annotations"],
): Segment[] {
  const ranges = annotations
    .map((a) => {
      const start = transcript.indexOf(a.originalSegment);
      if (start === -1) return null;
      return { start, end: start + a.originalSegment.length, annotation: a };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start < cursor) continue; // bỏ qua đoạn bị overlap với đoạn trước
    if (range.start > cursor) {
      segments.push({ text: transcript.slice(cursor, range.start) });
    }
    segments.push({
      text: transcript.slice(range.start, range.end),
      issue: range.annotation.issue,
      suggestion: range.annotation.suggestion,
    });
    cursor = range.end;
  }
  if (cursor < transcript.length) {
    segments.push({ text: transcript.slice(cursor) });
  }

  return segments;
}

export default function ImprovementPanel({ transcript, improvement }: Props) {
  const segments = buildHighlightedSegments(transcript, improvement.annotations);

  return (
    <section className="px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
          <Wand2 size={13} className="text-[#8b5cf6]" />
          Câu trả lời cải thiện
        </p>
      </div>

      {segments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-xs text-[#606072]">
            <FileText size={12} className="flex-shrink-0" />
            Phiên âm gốc, di chuột vào phần được tô để xem gợi ý
          </p>
          <p className="font-mono text-sm text-[#9898aa] leading-relaxed whitespace-pre-wrap">
            {segments.map((seg, i) =>
              seg.issue ? (
                <span key={i} className="relative group">
                  <mark
                    className="rounded px-0.5 cursor-help"
                    style={{
                      background: "rgba(245,158,11,0.15)",
                      color: "#f59e0b",
                    }}
                  >
                    {seg.text}
                  </mark>
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-[80vw] rounded-lg p-3 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                    style={{
                      background: "#13131c",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#9898aa",
                    }}
                  >
                    <span className="block font-semibold mb-1" style={{ color: "#f59e0b" }}>
                      {seg.issue}
                    </span>
                    <span>{seg.suggestion}</span>
                  </span>
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>
        </div>
      )}

      <blockquote
        className="border-l-2 pl-4 flex flex-col gap-1.5"
        style={{ borderColor: "#7c3aed" }}
      >
        <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
          <Sparkles size={13} className="text-[#8b5cf6]" />
          Phiên bản cải thiện
        </p>
        <p className="text-sm text-[#f4f4f6] leading-relaxed whitespace-pre-wrap">
          {improvement.improvedAnswer}
        </p>
      </blockquote>

      {improvement.keyChanges.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
            <ListChecks size={13} className="text-[#606072]" />
            Thay đổi chính
          </p>
          <ul className="flex flex-col gap-1.5">
            {improvement.keyChanges.map((item, i) => (
              <li key={i} className="text-sm text-[#9898aa] leading-relaxed flex gap-1.5">
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
