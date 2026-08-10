import type { RefObject } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import { formatTime } from "@/lib/utils/format";
import type { UploadState } from "./types";

const MIN_DURATION = 10;

// Recorder chính của trang /mock-interviews/[id], nhận ref từ useAudioRecorder để render waveform.
export function RecorderPanel({
  canRecord,
  recorderStatus,
  elapsed,
  errorMsg,
  uploadState,
  uploadError,
  isPlaying,
  recordContainerRef,
  playbackContainerRef,
  onStart,
  onStop,
  onReset,
  onTogglePlayback,
  timeIsUp,
}: {
  canRecord: boolean;
  recorderStatus: "idle" | "recording" | "error";
  elapsed: number;
  errorMsg: string;
  uploadState: UploadState;
  uploadError: string;
  isPlaying: boolean;
  recordContainerRef: RefObject<HTMLDivElement | null>;
  playbackContainerRef: RefObject<HTMLDivElement | null>;
  onStart: () => Promise<void>;
  onStop: () => void;
  onReset: () => void;
  onTogglePlayback: () => void;
  timeIsUp: boolean;
}) {
  if (timeIsUp) {
    return (
      <div className="rounded-3xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger backdrop-blur-xl">
        Đã hết thời gian. Bạn không thể gửi câu mới, hãy nộp bài để chấm các câu đã trả lời.
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-4 shadow-inner shadow-white/5 backdrop-blur-xl md:p-5">
      {recorderStatus === "idle" && uploadState === "idle" && (
        <div className="flex flex-col items-center gap-3 py-5 md:py-7">
          <button
            onClick={onStart}
            disabled={!canRecord}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/[0.075] text-white shadow-xl shadow-violet-950/25 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-200/55 hover:bg-violet-400/20 hover:shadow-violet-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:h-20 md:w-20"
          >
            <span className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(221,214,254,0.28),transparent_68%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Mic size={30} className="relative" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-white">
              Nhấn để ghi câu trả lời
            </p>
            <p className="mt-1 text-xs text-white/45">
              Tối thiểu {MIN_DURATION} giây trước khi hệ thống nhận bài.
            </p>
          </div>
        </div>
      )}

      <div
        className={
          recorderStatus === "recording" && uploadState === "idle"
            ? "flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4"
            : "pointer-events-none h-11 overflow-hidden opacity-0"
        }
      >
        <span className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-black text-danger">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
          REC
        </span>
        <div ref={recordContainerRef} className="min-w-[160px] flex-1" />
        <span className="font-mono text-lg font-black tabular-nums text-white">
          {formatTime(elapsed)}
        </span>
        <button
          onClick={onReset}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.055] text-white/65 transition-all duration-300 hover:border-white/25 hover:text-white"
          title="Hủy ghi âm"
        >
          <X size={16} />
        </button>
        <button
          onClick={onStop}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-danger text-white shadow-lg shadow-danger/20 transition-transform active:scale-95"
          title="Dừng và gửi"
        >
          <Square size={16} fill="white" className="text-white" />
        </button>
      </div>

      {uploadState === "uploading" && (
        <div className="flex items-center justify-center gap-3 py-6 text-sm text-white/62">
          <Loader2 size={16} className="animate-spin text-violet-200" />
          Đang phiên âm và lưu câu trả lời...
        </div>
      )}

      {uploadState === "done" && (
        <div className="flex items-center justify-center gap-3 py-5 text-sm font-semibold text-success">
          <CheckCircle2 size={16} />
          Đã lưu câu trả lời.
        </div>
      )}

      {uploadState === "error" && uploadError && (
        <InlineError message={uploadError} />
      )}

      {recorderStatus === "error" && errorMsg && (
        <InlineError message={errorMsg} />
      )}

      {uploadState !== "idle" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 md:flex-nowrap">
          <button
            onClick={onTogglePlayback}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.055] transition-all duration-300 hover:border-violet-300/40 hover:bg-violet-400/15"
          >
            {isPlaying ? (
              <Pause size={12} className="text-white" />
            ) : (
              <Play size={12} className="text-violet-200" />
            )}
          </button>
          <div ref={playbackContainerRef} className="min-w-[160px] flex-1" />
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-bold text-white/55 transition-all duration-300 hover:border-violet-300/35 hover:text-white"
          >
            <RotateCcw size={12} />
            ghi lại
          </button>
        </div>
      )}
    </div>
  );
}

// Panel audio sau khi đã trả lời, chỉ cho nghe lại ở room và để transcript cho trang result.
export function AnsweredPanel({
  audioUrl,
  duration,
}: {
  audioUrl: string;
  duration: number | null;
}) {
  return (
    <div className="rounded-[1.5rem] border border-success/25 bg-success/10 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-success">
        <CheckCircle2 size={16} />
        Câu này đã được ghi nhận
      </div>
      {audioUrl ? (
        <div className="mx-auto max-w-2xl">
          <audio controls src={audioUrl} className="h-11 w-full" />
          {duration !== null && (
            <p className="mt-2 text-center text-xs text-white/45">
              Thời lượng: {formatTime(duration)}
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-white/62">
          Đã lưu câu trả lời. Audio sẽ hiển thị sau khi tải lại dữ liệu.
        </p>
      )}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger backdrop-blur-xl">
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
