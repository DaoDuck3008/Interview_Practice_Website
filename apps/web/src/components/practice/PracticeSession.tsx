"use client";

import { useCallback, useState } from "react";
import {
  Mic,
  Square,
  RotateCcw,
  AlertCircle,
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import axios from "axios";
import { transcribeAudio } from "@/lib/api/speech";
import type { Score } from "@/lib/api/sessions";
import { formatTime } from "@/lib/utils/format";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import TranscriptPanel from "@/components/practice/TranscriptPanel";
import AnswerEvaluation from "@/components/practice/AnswerEvaluation";

type Phase = "idle" | "processing" | "evaluating" | "evaluated";

interface Props {
  questionId: string;
}

export default function PracticeSession({ questionId }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [transcriptError, setTranscriptError] = useState("");
  const [evaluation, setEvaluation] = useState<Score | null>(null);

  const handleRecordingComplete = useCallback(
    async (blob: Blob, duration: number) => {
      setPhase("processing");
      let transcriptText = "";
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("questionId", questionId);
        formData.append("duration", String(duration));
        // const session = await createSession(formData);
        // transcriptText = session.transcript ?? "";
        const { transcript } = await transcribeAudio(formData);
        transcriptText = transcript;
        setTranscriptError("");
      } catch (err) {
        // Ưu tiên message tiếng Việt từ backend (vd: hết hạn mức trong ngày)
        const serverMsg = axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined)
          : undefined;
        setTranscriptError(
          serverMsg ?? "Không thể phiên âm — vui lòng thử lại.",
        );
      }
      setTranscript(transcriptText);

      // Auto-evaluate immediately after processing
      setPhase("evaluating");
      try {
        // TODO: POST /sessions/:id/score once backend is ready
        throw new Error("not implemented");
      } catch {
        await new Promise((r) => setTimeout(r, 1800));
        setEvaluation({
          id: "mock",
          technicalScore: 7,
          completenessScore: 6,
          clarityScore: 8,
          hasExample: true,
          feedback:
            "Câu trả lời thể hiện hiểu biết tốt về các khái niệm cơ bản và đề cập đúng các điểm chính. Cần bổ sung thêm ví dụ thực tế để tăng tính thuyết phục. Hãy giải thích rõ hơn về cơ chế bên trong để gây ấn tượng với interviewer.",
        });
        setPhase("evaluated");
      }
    },
    [questionId],
  );

  const recorder = useAudioRecorder({ onComplete: handleRecordingComplete });

  const handleReset = useCallback(() => {
    recorder.reset();
    setPhase("idle");
    setTranscript("");
    setTranscriptError("");
    setEvaluation(null);
  }, [recorder]);

  const inPostRecording = phase === "evaluating" || phase === "evaluated";

  return (
    <div className="flex flex-col divide-y divide-[#1c1c28]">
      {/* ── Recorder pane ── */}
      <section className="px-6 py-6 flex flex-col gap-4">
        {/* IDLE */}
        {recorder.status === "idle" && phase === "idle" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <button
              onClick={recorder.start}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
              style={{
                background: "#7c3aed",
                boxShadow:
                  "0 0 40px rgba(124,58,237,0.45), 0 0 80px rgba(124,58,237,0.15)",
              }}
              aria-label="Bắt đầu ghi âm"
            >
              <Mic size={30} className="text-white" />
            </button>
            <p className="text-sm text-[#606072] font-mono">
              Nhấn để bắt đầu ghi âm
            </p>
          </div>
        )}

        {/* Recording row — always in DOM so recordContainerRef is mounted */}
        <div
          className="flex items-center gap-4"
          style={{ display: recorder.status === "recording" ? "flex" : "none" }}
        >
          <span
            className="flex items-center gap-1.5 text-xs font-mono font-bold flex-shrink-0"
            style={{ color: "#ef4444" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
              style={{ background: "#ef4444" }}
            />
            REC
          </span>
          <div ref={recorder.recordContainerRef} className="flex-1 min-w-0" />
          <span className="font-mono text-xl font-bold text-[#f4f4f6] tabular-nums flex-shrink-0">
            {formatTime(recorder.elapsed)}
          </span>
          <button
            onClick={recorder.stop}
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            style={{
              background: "#ef4444",
              boxShadow: "0 0 16px rgba(239,68,68,0.35)",
            }}
            aria-label="Dừng ghi âm"
          >
            <Square size={16} className="text-white" fill="white" />
          </button>
        </div>

        {/* PROCESSING */}
        {phase === "processing" && (
          <div className="flex items-center gap-3 py-2">
            <Loader2
              size={15}
              className="text-[#7c3aed] animate-spin flex-shrink-0"
            />
            <span className="text-sm text-[#9898aa] font-mono">
              processing audio...
            </span>
          </div>
        )}

        {/* Playback row — always in DOM so playbackContainerRef is mounted
            before the hook calls initPlayback on record-end */}
        <div
          className="flex items-center gap-3"
          style={{ display: inPostRecording ? "flex" : "none" }}
        >
          <button
            onClick={recorder.togglePlayback}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer hover:scale-105"
            style={{
              background: recorder.isPlaying ? "#7c3aed" : "#13131c",
              border: "1px solid",
              borderColor: recorder.isPlaying ? "#7c3aed" : "#1c1c28",
            }}
            aria-label={recorder.isPlaying ? "Tạm dừng" : "Phát lại"}
          >
            {recorder.isPlaying ? (
              <Pause size={12} className="text-white" />
            ) : (
              <Play
                size={12}
                className="text-[#8b5cf6]"
                style={{ marginLeft: 1 }}
              />
            )}
          </button>
          <div ref={recorder.playbackContainerRef} className="flex-1 min-w-0" />
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-[#606072] hover:text-[#9898aa] transition-colors cursor-pointer flex-shrink-0"
          >
            <RotateCcw size={11} />
            <span className="font-mono">ghi lại</span>
          </button>
        </div>

        {/* ERROR — microphone access */}
        {recorder.status === "error" && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={15}
                className="text-[#ef4444] flex-shrink-0 mt-0.5"
              />
              <p className="text-sm text-[#ef4444] leading-relaxed">
                {recorder.errorMsg}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-[#9898aa] hover:text-[#f4f4f6] transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              Thử lại
            </button>
          </div>
        )}
      </section>

      {/*  Transcript pane  */}
      {inPostRecording && (
        <TranscriptPanel
          transcript={transcript}
          errorMsg={transcriptError}
          isEvaluating={phase === "evaluating"}
        />
      )}

      {/*  Evaluation pane  */}
      {phase === "evaluated" && evaluation && (
        <AnswerEvaluation evaluation={evaluation} />
      )}
    </div>
  );
}
