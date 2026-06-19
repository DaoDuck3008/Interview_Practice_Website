import { AlertCircle, FileText, Loader2 } from "lucide-react";

interface Props {
  transcript: string;
  errorMsg: string;
  isEvaluating: boolean;
}

export default function TranscriptPanel({
  transcript,
  errorMsg,
  isEvaluating,
}: Props) {
  return (
    <section className="px-6 py-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-[#9898aa]">
          <FileText size={13} className="text-[#606072]" />
          Phiên âm
        </p>
        {isEvaluating && (
          <div className="flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin text-[#7c3aed]" />
            <span className="font-mono text-[10px] text-[#606072]">
              evaluating...
            </span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div
          className="flex items-start gap-2 text-xs text-[#f59e0b] p-3 rounded-lg"
          style={{
            background: "rgba(245,158,11,0.05)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {transcript ? (
        <p className="font-mono text-sm text-[#f4f4f6] leading-relaxed whitespace-pre-wrap">
          {transcript}
        </p>
      ) : (
        <p className="font-mono text-sm text-[#606072] italic">
          — transcript không có sẵn
        </p>
      )}
    </section>
  );
}
