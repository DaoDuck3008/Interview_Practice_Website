import { getSocket, waitForEvent } from "@/lib/ws/socket";
import type { Score, Improvement } from "@/lib/api/sessions";

// score()/improve() chạy qua hàng đợi BullMQ — đợi tối đa ngần này qua
// WebSocket trước khi coi là "lâu hơn dự kiến" và fallback fetch lại 1 lần
// (không phải vòng lặp polling định kỳ).
const JOB_WAIT_TIMEOUT_MS = 90_000;

interface ScoreReadyPayload {
  sessionId: string;
  score: Score;
}
interface ImproveReadyPayload {
  sessionId: string;
  improvement: Improvement;
}
interface JobFailedPayload {
  sessionId: string;
  message: string;
}

export type JobWaitResult<T> =
  | { status: "ready"; data: T }
  | { status: "failed"; message: string }
  | { status: "timeout" };

/** Đợi kết quả score() chạy qua hàng đợi, đẩy về qua WebSocket khi xong. */
export async function waitForScoreResult(
  sessionId: string,
): Promise<JobWaitResult<Score>> {
  const socket = getSocket();
  if (!socket) return { status: "timeout" };
  const result = await waitForEvent<ScoreReadyPayload | JobFailedPayload>(
    socket,
    ["score:ready", "score:failed"],
    (_event, payload) => payload.sessionId === sessionId,
    JOB_WAIT_TIMEOUT_MS,
  );
  if (!result) return { status: "timeout" };
  if (result.event === "score:failed") {
    return { status: "failed", message: (result.payload as JobFailedPayload).message };
  }
  return { status: "ready", data: (result.payload as ScoreReadyPayload).score };
}

/** Đợi kết quả improve() chạy qua hàng đợi, đẩy về qua WebSocket khi xong. */
export async function waitForImproveResult(
  sessionId: string,
): Promise<JobWaitResult<Improvement>> {
  const socket = getSocket();
  if (!socket) return { status: "timeout" };
  const result = await waitForEvent<ImproveReadyPayload | JobFailedPayload>(
    socket,
    ["improve:ready", "improve:failed"],
    (_event, payload) => payload.sessionId === sessionId,
    JOB_WAIT_TIMEOUT_MS,
  );
  if (!result) return { status: "timeout" };
  if (result.event === "improve:failed") {
    return { status: "failed", message: (result.payload as JobFailedPayload).message };
  }
  return {
    status: "ready",
    data: (result.payload as ImproveReadyPayload).improvement,
  };
}
