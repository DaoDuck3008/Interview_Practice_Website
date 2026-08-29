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
  Sparkles,
  X,
} from "lucide-react";
import axios from "axios";
import {
  createSession,
  scoreSession,
  improveSession,
  getSession,
} from "@/lib/api/sessions";
import type { Score, Improvement, Session } from "@/lib/api/sessions";
import { formatTime } from "@/lib/utils/format";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { audioFileNameFromBlob } from "@/lib/audioFile";
import { waitForScoreResult, waitForImproveResult } from "@/lib/ws/jobs";
import TranscriptPanel from "@/components/practice/TranscriptPanel";
import AnswerEvaluation from "@/components/practice/AnswerEvaluation";
import EvaluationSkeleton from "@/components/practice/EvaluationSkeleton";
import ImprovementPanel from "@/components/practice/ImprovementPanel";

type Phase = "idle" | "processing" | "evaluating" | "evaluated";

// Ghi âm ngắn hơn mức này coi như bấm nhầm — không upload để khỏi tốn lượt phiên âm.
const MIN_DURATION = 10; // giây

// Khi tới 3 phút thì cảnh báo sắp chạm trần 4 phút (hook tự dừng ở 4 phút).
const WARN_DURATION = 180; // giây

interface Props {
  questionId: string;
  onSessionSaved?: (session: Session) => void;
}

export default function PracticeSession({ questionId, onSessionSaved }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState("");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [transcript, setTranscript] = useState("");
  const [transcriptError, setTranscriptError] = useState("");
  const [evaluation, setEvaluation] = useState<Score | null>(null);
  const [evaluationError, setEvaluationError] = useState("");
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const [improvementError, setImprovementError] = useState("");
  const [isImproving, setIsImproving] = useState(false);

  const applyScore = useCallback(
    (session: Session, score: Score) => {
      setEvaluation(score);
      setEvaluationError("");
      // Điểm 0 (trống/lạc đề) không được backend lưu -> đừng thêm vào lịch sử.
      const isZero =
        score.technicalScore === 0 &&
        score.completenessScore === 0 &&
        score.clarityScore === 0;
      if (!isZero) {
        const saved = { ...session, score };
        setCurrentSession(saved);
        onSessionSaved?.(saved);
      }
    },
    [onSessionSaved],
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob, duration: number) => {
      // Chặn bản ghi quá ngắn (bấm nhầm) trước khi tốn 1 lượt phiên âm.
      if (duration < MIN_DURATION) {
        setTranscript("");
        setTranscriptError(
          "Bản ghi quá ngắn — hãy ghi âm và trả lời câu hỏi dài hơn một chút nhé.",
        );
        setPhase("evaluated");
        return;
      }

      // Bước 1: upload + phiên âm
      setPhase("processing");
      let createdSession: Session | null = null;
      try {
        const formData = new FormData();
        formData.append("audio", blob, audioFileNameFromBlob(blob));
        formData.append("questionId", questionId);
        formData.append("duration", String(duration));
        createdSession = await createSession(formData);
        setSessionId(createdSession.id);
        setTranscript(createdSession.transcript);
        setTranscriptError("");
      } catch (err) {
        // Ưu tiên message tiếng Việt từ backend (ví dụ: không đủ AI credits).
        const serverMsg = axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined)
          : undefined;
        setTranscript("");
        setTranscriptError(
          serverMsg ?? "Không thể phiên âm — vui lòng thử lại.",
        );
        // Không có session thì không thể chấm điểm, dừng tại transcript
        setPhase("evaluated");
        return;
      }

      // Bước 2: chấm điểm — chạy qua hàng đợi BullMQ, kết quả đẩy về qua WebSocket
      setPhase("evaluating");
      try {
        const res = await scoreSession(createdSession.id);
        if (res.status === "ready") {
          applyScore(createdSession, res.data);
        } else {
          const result = await waitForScoreResult(createdSession.id);
          if (result.status === "ready") {
            applyScore(createdSession, result.data);
          } else if (result.status === "failed") {
            setEvaluationError(result.message);
            onSessionSaved?.(createdSession);
          } else {
            // Mất kết nối WS đúng lúc job xong (hoặc chưa kịp connect) — thử
            // fetch lại 1 lần thay vì vòng lặp polling.
            const fresh = await getSession(createdSession.id).catch(() => null);
            if (fresh?.score) {
              applyScore(createdSession, fresh.score);
            } else {
              setEvaluationError(
                "Đang xử lý lâu hơn dự kiến — bạn thử tải lại trang sau ít phút nhé.",
              );
              onSessionSaved?.(createdSession);
            }
          }
        }
      } catch (err) {
        const serverMsg = axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined)
          : undefined;
        setEvaluationError(
          serverMsg ?? "Không thể chấm điểm — vui lòng thử lại.",
        );
        onSessionSaved?.(createdSession);
      }
      setPhase("evaluated");
    },
    [
      questionId,
      onSessionSaved,
      applyScore,
    ],
  );

  const {
    recordContainerRef,
    playbackContainerRef,
    status: recorderStatus,
    elapsed: recorderElapsed,
    isPlaying,
    errorMsg,
    start: startRecorder,
    stop: stopRecorder,
    togglePlayback,
    reset: resetRecorder,
  } = useAudioRecorder({ onComplete: handleRecordingComplete });

  const applyImprovement = useCallback(
    (improvement: Improvement) => {
      setImprovement(improvement);
      setImprovementError("");
      // Đồng bộ vào lịch sử để khung "Phiên bản cải thiện" hiện ngay, không cần reload.
      if (currentSession) {
        const updated = { ...currentSession, improvement };
        setCurrentSession(updated);
        onSessionSaved?.(updated);
      }
    },
    [currentSession, onSessionSaved],
  );

  const handleImprove = useCallback(async () => {
    setIsImproving(true);
    try {
      const res = await improveSession(sessionId);
      if (res.status === "ready") {
        applyImprovement(res.data);
      } else {
        const result = await waitForImproveResult(sessionId);
        if (result.status === "ready") {
          applyImprovement(result.data);
        } else if (result.status === "failed") {
          setImprovementError(result.message);
        } else {
          const fresh = await getSession(sessionId).catch(() => null);
          if (fresh?.improvement) {
            applyImprovement(fresh.improvement);
          } else {
            setImprovementError(
              "Đang xử lý lâu hơn dự kiến — bạn thử tải lại trang sau ít phút nhé.",
            );
          }
        }
      }
    } catch (err) {
      const serverMsg = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : undefined;
      setImprovementError(
        serverMsg ?? "Không thể tạo bản cải thiện — vui lòng thử lại.",
      );
    }
    setIsImproving(false);
  }, [sessionId, applyImprovement]);

  const handleReset = useCallback(() => {
    resetRecorder();
    setPhase("idle");
    setSessionId("");
    setCurrentSession(null);
    setTranscript("");
    setTranscriptError("");
    setEvaluation(null);
    setEvaluationError("");
    setImprovement(null);
    setImprovementError("");
    setIsImproving(false);
  }, [resetRecorder]);

  const inPostRecording = phase === "evaluating" || phase === "evaluated";

  // Điểm 0 (trống/lạc đề) không được lưu -> không cho cải thiện (session đã bị xóa).
  const evaluationIsZero =
    !!evaluation &&
    evaluation.technicalScore === 0 &&
    evaluation.completenessScore === 0 &&
    evaluation.clarityScore === 0;

  return (
    <div
      className="flex flex-col divide-y divide-white/[0.07] overflow-hidden rounded-[24px] border border-[#c4b5fd]/16 bg-[#1b2248]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 48px rgba(2,6,23,0.18)",
      }}
    >
      {/* Recorder pane */}
      <section className="px-6 py-6 flex flex-col gap-4">
        {/* IDLE */}
        {recorderStatus === "idle" && phase === "idle" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <button
              onClick={() => {
                new Audio("/sounds/record_start.mp3").play().catch(() => {});
                startRecorder();
              }}
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

        {/* Recording row 
            Chỉ hiện khi đang thực sự ghi âm (phase idle); sau khi bấm Square và
            chuyển sang processing/evaluated thì ẩn đi (recorder.status không tự
            về "idle" cho tới khi reset). */}
        <div
          className="flex items-center gap-4"
          style={{
            display:
              recorderStatus === "recording" && phase === "idle"
                ? "flex"
                : "none",
          }}
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
            {formatTime(recorderElapsed)}
          </span>
          {/* Hủy: bỏ bản ghi đang dở, về đầu, KHÔNG gửi đi phiên âm */}
          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            style={{ background: "#13131c", border: "1px solid #1c1c28" }}
            aria-label="Hủy ghi âm"
            title="Hủy và ghi lại"
          >
            <X size={16} className="text-[#9898aa]" />
          </button>
          {/* Dừng: kết thúc ghi âm và gửi đi chấm điểm */}
          <button
            onClick={stopRecorder}
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            style={{
              background: "#ef4444",
              boxShadow: "0 0 16px rgba(239,68,68,0.35)",
            }}
            aria-label="Dừng ghi âm"
            title="Dừng và chấm điểm"
          >
            <Square size={16} className="text-white" fill="white" />
          </button>
        </div>

        {/* Cảnh báo sắp chạm trần độ dài (5 phút) — hiện từ phút thứ 4 */}
        {recorderStatus === "recording" &&
          phase === "idle" &&
          recorderElapsed >= WARN_DURATION && (
            <p className="text-xs font-medium text-[#ef4444]">quá dài rồi</p>
          )}

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
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-[#606072] hover:text-[#9898aa] transition-colors cursor-pointer flex-shrink-0"
          >
            <RotateCcw size={11} />
            <span className="font-mono">ghi lại</span>
          </button>
        </div>

        {/* ERROR — microphone access */}
        {recorderStatus === "error" && (
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

      {/*  Loading — AI đang chấm điểm  */}
      {phase === "evaluating" && <EvaluationSkeleton />}

      {/*  Evaluation pane  */}
      {phase === "evaluated" && evaluation && (
        <AnswerEvaluation evaluation={evaluation} sessionId={sessionId} />
      )}

      {/*  Evaluation error  */}
      {phase === "evaluated" && !evaluation && evaluationError && (
        <section className="px-6 py-5">
          <div
            className="flex items-start gap-2 text-xs text-[#f59e0b] p-3 rounded-lg"
            style={{
              background: "rgba(245,158,11,0.05)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            {evaluationError}
          </div>
        </section>
      )}

      {/*  Improve action  */}
      {phase === "evaluated" &&
        evaluation &&
        !evaluationIsZero &&
        !improvement && (
          <section className="px-6 py-5">
            {isImproving ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2
                  size={15}
                  className="text-[#7c3aed] animate-spin flex-shrink-0"
                />
                <span className="text-sm text-[#9898aa] font-mono">
                  đang tạo bản cải thiện...
                </span>
              </div>
            ) : (
              <button
                onClick={handleImprove}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8b5cf6] transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(124,58,237,0.08)",
                  border: "1px solid rgba(124,58,237,0.3)",
                }}
              >
                <Sparkles size={15} />
                Cải thiện câu trả lời
              </button>
            )}

            {improvementError && (
              <div
                className="flex items-start gap-2 text-xs text-[#f59e0b] p-3 rounded-lg mt-3"
                style={{
                  background: "rgba(245,158,11,0.05)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                {improvementError}
              </div>
            )}
          </section>
        )}

      {/*  Improvement pane  */}
      {improvement && (
        <ImprovementPanel transcript={transcript} improvement={improvement} />
      )}
    </div>
  );
}
