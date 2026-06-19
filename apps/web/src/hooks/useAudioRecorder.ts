import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type WaveSurferType from "wavesurfer.js";
import type RecordPluginType from "wavesurfer.js/plugins/record";

export type RecorderStatus = "idle" | "recording" | "error";

interface UseAudioRecorderOptions {
  /** Called after a recording finishes, with the recorded blob and its duration (s). */
  onComplete: (blob: Blob, duration: number) => void;
}

export interface AudioRecorder {
  recordContainerRef: RefObject<HTMLDivElement | null>;
  playbackContainerRef: RefObject<HTMLDivElement | null>;
  status: RecorderStatus;
  elapsed: number;
  isPlaying: boolean;
  /** Microphone access error message (Vietnamese). */
  errorMsg: string;
  start: () => Promise<void>;
  stop: () => void;
  togglePlayback: () => void;
  reset: () => void;
}

export function useAudioRecorder({
  onComplete,
}: UseAudioRecorderOptions): AudioRecorder {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const recordContainerRef = useRef<HTMLDivElement>(null);
  const playbackContainerRef = useRef<HTMLDivElement>(null);

  const recordWsRef = useRef<WaveSurferType | null>(null);
  const recordPluginRef = useRef<RecordPluginType | null>(null);
  const playbackWsRef = useRef<WaveSurferType | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Keep the latest onComplete without forcing startRecording to re-create.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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

  const start = useCallback(async () => {
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
        // Guard: reset may have already destroyed this instance
        if (recordWsRef.current !== ws) return;
        recordWsRef.current = null;
        recordPluginRef.current = null;
        // Defer destroy: the plugin's own record-end listener (stopMic) closes
        // the AudioContext. Destroying synchronously here runs before it and
        // closes the context twice → "Cannot close a closed AudioContext".
        setTimeout(() => {
          try {
            ws.destroy();
          } catch {
            /* AudioContext already closed */
          }
        }, 0);
        await initPlayback(blob);
        onCompleteRef.current(blob, duration);
      });

      recordWsRef.current = ws;
      recordPluginRef.current = record;

      await record.startRecording();

      setStatus("recording");
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
      setStatus("error");
    }
  }, [initPlayback]);

  const stop = useCallback(() => {
    recordPluginRef.current?.stopRecording();
  }, []);

  const togglePlayback = useCallback(() => {
    playbackWsRef.current?.playPause();
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recordPluginRef.current?.stopRecording();
    recordPluginRef.current = null;
    if (recordWsRef.current) {
      try {
        recordWsRef.current.destroy();
      } catch {
        /* AudioContext already closed */
      }
      recordWsRef.current = null;
    }
    if (playbackWsRef.current) {
      try {
        playbackWsRef.current.destroy();
      } catch {
        /* AudioContext already closed */
      }
      playbackWsRef.current = null;
    }
    setStatus("idle");
    setElapsed(0);
    elapsedRef.current = 0;
    setIsPlaying(false);
    setErrorMsg("");
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordWsRef.current) {
        try {
          recordWsRef.current.destroy();
        } catch {
          /* AudioContext already closed */
        }
      }
      if (playbackWsRef.current) {
        try {
          playbackWsRef.current.destroy();
        } catch {
          /* AudioContext already closed */
        }
      }
    };
  }, []);

  return {
    recordContainerRef,
    playbackContainerRef,
    status,
    elapsed,
    isPlaying,
    errorMsg,
    start,
    stop,
    togglePlayback,
    reset,
  };
}
