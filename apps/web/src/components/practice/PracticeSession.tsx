"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic,
  Square,
  RotateCcw,
  AlertCircle,
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import type WaveSurferType from "wavesurfer.js";
import type RecordPluginType from "wavesurfer.js/plugins/record";
import { createSession } from "@/lib/api/sessions";
import type { Score } from "@/lib/api/sessions";
import { formatTime } from "@/lib/utils/format";

type RecordingState =
  | "idle"
  | "recording"
  | "processing"
  | "evaluating"
  | "evaluated"
  | "error";

// ── Circular progress (SVG) ──────────────────────────────────────────────────
function CircularScore({
  score,
  label,
  color = "#7c3aed",
}: {
  score: number;
  label: string;
  color?: string;
}) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(10, score)) / 10);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#1c1c28"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x="40"
          y="45"
          textAnchor="middle"
          fill="#f4f4f6"
          fontSize="17"
          fontWeight="bold"
          fontFamily="inherit"
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-[#9898aa] text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  questionId: string;
}

export default function PracticeSession({ questionId }: Props) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<Score | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const recordContainerRef = useRef<HTMLDivElement>(null);
  const playbackContainerRef = useRef<HTMLDivElement>(null);

  const recordWsRef = useRef<WaveSurferType | null>(null);
  const recordPluginRef = useRef<RecordPluginType | null>(null);
  const playbackWsRef = useRef<WaveSurferType | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const initPlayback = useCallback(async (blob: Blob) => {
    if (!playbackContainerRef.current) return;
    const { default: WaveSurfer } = await import("wavesurfer.js");

    if (playbackWsRef.current) {
      playbackWsRef.current.destroy();
      playbackWsRef.current = null;
    }

    const url = URL.createObjectURL(blob);
    const ws = WaveSurfer.create({
      container: playbackContainerRef.current,
      waveColor: "#3d2d5c",
      progressColor: "#7c3aed",
      cursorColor: "#a78bfa",
      height: 48,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      url,
    });
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    playbackWsRef.current = ws;
  }, []);

  const processAudio = useCallback(
    async (blob: Blob, duration: number) => {
      setState("processing");
      let transcriptText = "";
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("questionId", questionId);
        formData.append("duration", String(duration));
        const session = await createSession(formData);
        transcriptText = session.transcript ?? "";
        setErrorMsg("");
      } catch {
        setErrorMsg("API chưa sẵn sàng — transcript không có sẵn.");
      }
      setTranscript(transcriptText);
      await initPlayback(blob);

      // Auto-evaluate immediately after processing
      setState("evaluating");
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
        setState("evaluated");
      }
    },
    [questionId, initPlayback],
  );

  const startRecording = useCallback(async () => {
    if (!recordContainerRef.current) return;
    setErrorMsg("");

    try {
      const [{ default: WaveSurfer }, { default: RecordPlugin }] =
        await Promise.all([
          import("wavesurfer.js"),
          import("wavesurfer.js/plugins/record"),
        ]);

      if (recordWsRef.current) {
        recordWsRef.current.destroy();
        recordWsRef.current = null;
      }

      const ws = WaveSurfer.create({
        container: recordContainerRef.current,
        waveColor: "#7c3aed",
        height: 48,
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        interact: false,
      });

      const record = ws.registerPlugin(
        RecordPlugin.create({
          scrollingWaveform: true,
          scrollingWaveformWindow: 8,
          renderRecordedAudio: false,
        }),
      );

      record.on("record-end", async (blob: Blob) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const duration = elapsedRef.current;
        // Guard: resetAll may have already destroyed this instance
        if (recordWsRef.current !== ws) return;
        try { ws.destroy(); } catch { /* AudioContext already closed */ }
        recordWsRef.current = null;
        recordPluginRef.current = null;
        await processAudio(blob, duration);
      });

      recordWsRef.current = ws;
      recordPluginRef.current = record;

      await record.startRecording();

      setState("recording");
      elapsedRef.current = 0;
      setElapsed(0);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed((v) => v + 1);
      }, 1000);
    } catch {
      setErrorMsg(
        "Không thể truy cập microphone. Vui lòng kiểm tra quyền trong trình duyệt.",
      );
      setState("error");
    }
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    recordPluginRef.current?.stopRecording();
  }, []);

  const togglePlayback = useCallback(() => {
    playbackWsRef.current?.playPause();
  }, []);

  const resetAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recordPluginRef.current?.stopRecording();
    recordPluginRef.current = null;
    if (recordWsRef.current) {
      try { recordWsRef.current.destroy(); } catch { /* AudioContext already closed */ }
      recordWsRef.current = null;
    }
    if (playbackWsRef.current) {
      try { playbackWsRef.current.destroy(); } catch { /* AudioContext already closed */ }
      playbackWsRef.current = null;
    }
    setState("idle");
    setElapsed(0);
    elapsedRef.current = 0;
    setIsPlaying(false);
    setTranscript("");
    setEvaluation(null);
    setErrorMsg("");
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordWsRef.current) {
        try { recordWsRef.current.destroy(); } catch { /* AudioContext already closed */ }
      }
      if (playbackWsRef.current) {
        try { playbackWsRef.current.destroy(); } catch { /* AudioContext already closed */ }
      }
    };
  }, []);

  const inPostRecording = state === "evaluating" || state === "evaluated";

  return (
    <div className="flex flex-col divide-y divide-[#1c1c28]">
      {/* ── Recorder pane ── */}
      <section className="px-6 py-6 flex flex-col gap-4">
        {/* IDLE */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <button
              onClick={startRecording}
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
          style={{ display: state === "recording" ? "flex" : "none" }}
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
          <div ref={recordContainerRef} className="flex-1 min-w-0" />
          <span className="font-mono text-xl font-bold text-[#f4f4f6] tabular-nums flex-shrink-0">
            {formatTime(elapsed)}
          </span>
          <button
            onClick={stopRecording}
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
        {state === "processing" && (
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

        {/* Playback row */}
        {inPostRecording && (
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayback}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer hover:scale-105"
              style={{
                background: isPlaying ? "#7c3aed" : "#13131c",
                border: "1px solid",
                borderColor: isPlaying ? "#7c3aed" : "#1c1c28",
              }}
              aria-label={isPlaying ? "Tạm dừng" : "Phát lại"}
            >
              {isPlaying ? (
                <Pause size={12} className="text-white" />
              ) : (
                <Play
                  size={12}
                  className="text-[#8b5cf6]"
                  style={{ marginLeft: 1 }}
                />
              )}
            </button>
            <div ref={playbackContainerRef} className="flex-1 min-w-0" />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs text-[#606072] hover:text-[#9898aa] transition-colors cursor-pointer flex-shrink-0"
            >
              <RotateCcw size={11} />
              <span className="font-mono">ghi lại</span>
            </button>
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-start gap-2">
              <AlertCircle
                size={15}
                className="text-[#ef4444] flex-shrink-0 mt-0.5"
              />
              <p className="text-sm text-[#ef4444] leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-sm text-[#9898aa] hover:text-[#f4f4f6] transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              Thử lại
            </button>
          </div>
        )}
      </section>

      {/* ── Transcript pane ── */}
      {inPostRecording && (
        <section className="px-6 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#606072] font-mono">$ transcript</p>
            {state === "evaluating" && (
              <div className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin text-[#7c3aed]" />
                <span className="font-mono text-[10px] text-[#606072]">evaluating...</span>
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
      )}

      {/* ── Evaluation pane ── */}
      {state === "evaluated" && evaluation && (
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

          <div>
            {evaluation.hasExample ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30">
                Có ví dụ minh họa ✓
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30">
                Thiếu ví dụ ✗
              </span>
            )}
          </div>

          <blockquote className="border-l-2 border-[#7c3aed] pl-4 flex flex-col gap-1.5">
            <p className="text-xs text-[#606072] font-mono">nhận xét</p>
            <p className="text-sm text-[#9898aa] leading-relaxed">
              {evaluation.feedback}
            </p>
          </blockquote>
        </section>
      )}
    </div>
  );
}
